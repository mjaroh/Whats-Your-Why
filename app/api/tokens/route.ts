import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { listTokens, openToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function athleteId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return isSetUp(await getAthlete(userId)) ? userId : null;
}

// The athlete's Askesis tokens.
export async function GET() {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ tokens: await listTokens(id) }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// Marks a token as opened, so its emblem stops showing "new".
export async function POST(req: Request) {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await openToken(id, parsed.data.day);
  return NextResponse.json({ ok: true });
}
