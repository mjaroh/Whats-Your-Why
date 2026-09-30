import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { setFavorite } from "@/lib/media";

export const runtime = "nodejs";

const Body = z.object({
  source: z.enum(["coach", "group"]),
  messageId: z.number().int().positive(),
  on: z.boolean(),
});

// Save (or unsave) a message from the coach or the group to the profile.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isSetUp(await getAthlete(userId))) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { source, messageId, on } = parsed.data;
  const ok = await setFavorite(userId, source, messageId, on);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
