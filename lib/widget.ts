import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { activeHabits, today } from "./habits";

// The iPhone widgets (home screen and lock screen) can't use the app's
// sign-in, so turning them on gives the phone a long random key just for
// them. Only its hash is stored; it can read and check off today's must dos
// and nothing else. Turning widgets off, or deleting the account, ends it.

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createWidgetToken(athleteId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const sql = await db();
  await sql`INSERT INTO widget_tokens (token_hash, athlete_id) VALUES (${hash(token)}, ${athleteId})`;
  return token;
}

export async function revokeWidgetTokens(athleteId: string) {
  const sql = await db();
  await sql`DELETE FROM widget_tokens WHERE athlete_id = ${athleteId}`;
}

/**
 * The athlete a widget request belongs to, from its `X-Widget-Key` header.
 * (Not `Authorization`, which the sign-in middleware reads as its own.)
 */
export async function widgetAthlete(req: Request): Promise<string | null> {
  const token = req.headers.get("x-widget-key")?.match(/^[\w-]{20,100}$/)?.[0];
  if (!token) return null;
  const sql = await db();
  const [row] = await sql<{ athlete_id: string }[]>`
    UPDATE widget_tokens SET last_used_at = now() WHERE token_hash = ${hash(token)}
    RETURNING athlete_id`;
  return row?.athlete_id ?? null;
}

export type WidgetDay = {
  date: string;
  musts: { id: number; title: string; done: boolean }[];
  sleepLogged: boolean;
};

/** What the widgets show: today's must dos and whether each is done. */
export async function widgetDay(athleteId: string, date: string): Promise<WidgetDay> {
  const [habits, day] = await Promise.all([activeHabits(athleteId), today(athleteId, date)]);
  return {
    date,
    musts: habits
      .filter((h) => h.tier === "must")
      .map((h) => ({ id: h.id, title: h.title, done: day.checked.includes(h.id) })),
    sleepLogged: day.sleep !== null,
  };
}
