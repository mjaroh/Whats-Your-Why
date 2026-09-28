import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { reportMessage } from "@/lib/group";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({ messageId: z.number().int().positive() });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isSetUp(await getAthlete(userId))) return NextResponse.json({ ok: false }, { status: 403 });
  if (!(await rateLimit(`report:${userId}`, 20, 60 * 60_000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await reportMessage(parsed.data.messageId, userId);
  return NextResponse.json({ ok: true });
}
