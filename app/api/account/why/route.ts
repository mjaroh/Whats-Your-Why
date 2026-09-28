import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAthlete, isSetUp, saveWhy } from "@/lib/athletes";
import { WhyBody } from "@/lib/schemas";

export const runtime = "nodejs";

// A signed-in member retook the Seven Whys and wants the coach to use the new why.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) return NextResponse.json({ ok: false }, { status: 400 });
  const parsed = WhyBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await saveWhy(userId, parsed.data);
  return NextResponse.json({ ok: true });
}
