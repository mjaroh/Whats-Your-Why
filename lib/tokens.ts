import "server-only";
import { db } from "./db";
import { earnsToken } from "./tokenRules";
import { activeHabits, today } from "./habits";

export type Token = { number: number; day: string; opened: boolean };

/** Every token the athlete has, oldest first, numbered from 1. */
export async function listTokens(athleteId: string): Promise<Token[]> {
  const sql = await db();
  const rows = await sql<{ day: string; opened: boolean }[]>`
    SELECT to_char(day, 'YYYY-MM-DD') AS day, opened_at IS NOT NULL AS opened
    FROM askesis_tokens WHERE athlete_id = ${athleteId} ORDER BY day`;
  return rows.map((r, i) => ({ number: i + 1, day: r.day, opened: r.opened }));
}

/**
 * Gives the athlete today's token if today now earns one. Returns the new
 * token's number, or null (not earned, or already given today).
 */
export async function awardToken(athleteId: string, day: string): Promise<number | null> {
  const [habits, row] = await Promise.all([activeHabits(athleteId), today(athleteId, day)]);
  if (!earnsToken(habits, row.checked, row.sleep)) return null;
  const sql = await db();
  const inserted = await sql`
    INSERT INTO askesis_tokens (athlete_id, day) VALUES (${athleteId}, ${day})
    ON CONFLICT (athlete_id, day) DO NOTHING RETURNING day`;
  if (inserted.length === 0) return null;
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM askesis_tokens WHERE athlete_id = ${athleteId} AND day <= ${day}::date`;
  return n;
}

export async function openToken(athleteId: string, day: string) {
  const sql = await db();
  await sql`
    UPDATE askesis_tokens SET opened_at = now()
    WHERE athlete_id = ${athleteId} AND day = ${day} AND opened_at IS NULL`;
}
