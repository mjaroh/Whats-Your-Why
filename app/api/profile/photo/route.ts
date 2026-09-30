import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { blobEnabled, jpegFromDataUrl, putPrivateImage, removeBlobs } from "@/lib/blob";
import { setAvatar } from "@/lib/media";
import { profilePhotoAllowed } from "@/lib/moderation";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({ image: z.string().max(1_500_000) });

// Profile photos are shown next to group messages, so Claude checks each one
// before it's saved.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!blobEnabled()) return NextResponse.json({ error: "Photos aren't switched on yet." }, { status: 503 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete) || athlete!.banned_at) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!(await rateLimit(`photo:${userId}`, 10, 24 * 60 * 60_000))) {
    return NextResponse.json({ error: "Too many photo changes today. Try tomorrow." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const jpeg = parsed.success ? jpegFromDataUrl(parsed.data.image, 1_000_000) : null;
  if (!jpeg) return NextResponse.json({ error: "Couldn't read that photo." }, { status: 400 });

  const ok = await profilePhotoAllowed(jpeg).catch((err) => {
    console.error("photo check failed", err);
    return null;
  });
  if (ok === null) return NextResponse.json({ error: "Couldn't check that photo. Try again." }, { status: 502 });
  if (!ok) {
    return NextResponse.json(
      { error: "Pick a different photo. Keep it appropriate, with no school names, addresses or other personal details." },
      { status: 400 },
    );
  }

  const pathname = `avatars/${userId}/${randomUUID()}.jpg`;
  await putPrivateImage(pathname, jpeg);
  const previous = await setAvatar(userId, pathname);
  await removeBlobs([previous]);
  return NextResponse.json({ ok: true });
}
