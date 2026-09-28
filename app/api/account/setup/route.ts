import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveWhy, setupAthlete } from "@/lib/athletes";
import { WhyBody } from "@/lib/schemas";

export const runtime = "nodejs";

const Body = z.object({
  ageConfirmed: z.literal(true),
  why: WhyBody.nullable(),
});

// Runs once after sign-up: records the 13+ confirmation and saves the why
// the athlete just found in the free exercise.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const user = await currentUser();
  await setupAthlete(userId, user?.firstName ?? null);
  if (parsed.data.why) await saveWhy(userId, parsed.data.why);
  return NextResponse.json({ ok: true });
}
