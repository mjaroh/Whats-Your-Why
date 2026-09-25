import { NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  parentEmail: z.string().trim().toLowerCase().email().max(254),
  athleteFirstName: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[\p{L}][\p{L}' .-]*$/u, "First name only"),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const ipHash = hashIp(clientIp(req));
  if (!(await rateLimit(`signup:${ipHash}`, 5, 10 * 60_000))) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the email and first name, then try again." },
      { status: 400 },
    );
  }
  if (!hasDatabase()) {
    console.error("signup not saved: DATABASE_URL is not set");
    return NextResponse.json({ ok: false, error: "Signups are not open yet." }, { status: 503 });
  }

  const { parentEmail, athleteFirstName } = parsed.data;
  try {
    const sql = await db();
    await sql`
      INSERT INTO signups (parent_email, athlete_first_name)
      VALUES (${parentEmail}, ${athleteFirstName})`;
  } catch (err) {
    console.error("signup insert failed", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
