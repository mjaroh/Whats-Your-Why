import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveWhy, setupAthlete, UsernameTakenError } from "@/lib/athletes";
import { usernameAllowed } from "@/lib/moderation";
import { usernameProblem } from "@/lib/rules";
import { WhyBody } from "@/lib/schemas";

export const runtime = "nodejs";

const Body = z.object({
  ageConfirmed: z.literal(true),
  username: z.string().trim().max(40),
  why: WhyBody.nullable(),
});

// Runs once after sign-up: records the 13+ confirmation and username, and
// saves the why the athlete found in the free exercise.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Check your details." }, { status: 400 });
  const { username, why } = parsed.data;

  const problem = usernameProblem(username);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });
  const allowed = await usernameAllowed(username).catch((err) => {
    console.error("username check failed", err);
    return null;
  });
  if (allowed === null) {
    return NextResponse.json({ ok: false, error: "Couldn't check that name. Try again." }, { status: 502 });
  }
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Pick a different username. Keep it clean, and don't use your full name, school or city." },
      { status: 400 },
    );
  }

  const user = await currentUser();
  try {
    await setupAthlete(userId, user?.firstName ?? null, username);
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return NextResponse.json({ ok: false, error: "That username is taken." }, { status: 409 });
    }
    throw err;
  }
  if (why) await saveWhy(userId, why);
  return NextResponse.json({ ok: true });
}
