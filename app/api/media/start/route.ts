import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isMember, isSetUp } from "@/lib/athletes";
import { blobEnabled } from "@/lib/blob";
import { VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS, VIDEO_TYPES } from "@/lib/constants";
import { reserveVideo } from "@/lib/media";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  purpose: z.enum(["coach", "group"]),
  contentType: z.string(),
  size: z.number().int().positive(),
  duration: z.number().positive(),
});

// Step 1 of sending a video: check the athlete may send it and reserve its
// storage path. The phone then uploads straight to that path.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!blobEnabled()) return NextResponse.json({ error: "Video isn't switched on yet." }, { status: 503 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) return NextResponse.json({ error: "Finish setup first." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Couldn't read that video." }, { status: 400 });
  const { purpose, contentType, size, duration } = parsed.data;

  if (purpose === "coach" && !isMember(athlete)) {
    return NextResponse.json({ error: "Video feedback is part of the private coach." }, { status: 402 });
  }
  if (purpose === "group" && athlete!.banned_at) {
    return NextResponse.json({ error: "Your account can't post in the group." }, { status: 403 });
  }
  if (!VIDEO_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Use a regular phone video (MP4 or MOV)." }, { status: 400 });
  }
  if (duration > VIDEO_MAX_SECONDS + 1) {
    return NextResponse.json({ error: `Videos can be up to ${VIDEO_MAX_SECONDS} seconds. Trim it and try again.` }, { status: 400 });
  }
  if (size > VIDEO_MAX_BYTES) {
    return NextResponse.json({ error: "That video file is too big. Trim it or record at a lower quality." }, { status: 400 });
  }
  const perDay = purpose === "coach" ? 10 : 5;
  if (!(await rateLimit(`video:${purpose}:${userId}`, perDay, 24 * 60 * 60_000))) {
    return NextResponse.json({ error: `That's ${perDay} videos today. Try again tomorrow.` }, { status: 429 });
  }

  const reserved = await reserveVideo(userId, purpose, contentType, duration);
  return NextResponse.json({ mediaId: reserved.id, pathname: reserved.pathname });
}
