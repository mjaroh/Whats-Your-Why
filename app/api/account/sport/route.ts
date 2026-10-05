import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp, setSport } from "@/lib/athletes";
import { SPORT_MAX_CHARS } from "@/lib/sports";

export const runtime = "nodejs";

const Body = z.object({ sport: z.string().trim().max(SPORT_MAX_CHARS).nullable() });

// Set or change the athlete's sport from their profile.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isSetUp(await getAthlete(userId))) return NextResponse.json({ ok: false }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await setSport(userId, parsed.data.sport);
  return NextResponse.json({ ok: true });
}
