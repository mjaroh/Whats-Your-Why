import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { createWidgetToken, revokeWidgetTokens } from "@/lib/widget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function athleteId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return isSetUp(await getAthlete(userId)) ? userId : null;
}

// Turning widgets on: a key for this phone's widgets.
export async function POST() {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ token: await createWidgetToken(id) }, { headers: { "Cache-Control": "no-store" } });
}

// Turning widgets off: every widget key for this athlete stops working.
export async function DELETE() {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await revokeWidgetTokens(id);
  return NextResponse.json({ ok: true });
}
