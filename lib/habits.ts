import "server-only";
import { db } from "./db";
import { dayCounts, TIER_MAX, type DayCounts, type Habit, type Tier } from "./habitRules";

// The habit tracker. Each athlete writes their own Must / Want / Wish habits.
// Every local day gets its own row (the checklist starts blank at midnight),
// which keeps what they checked, that day's done/total per tier, and sleep.

export type LogDay = {
  day: string; // YYYY-MM-DD
  counts: DayCounts | null;
  checked: string[]; // titles, as they were named
  sleep: number | null;
};

export async function activeHabits(athleteId: string): Promise<Habit[]> {
  const sql = await db();
  return sql<Habit[]>`
    SELECT id::int AS id, tier, title FROM habits
    WHERE athlete_id = ${athleteId} AND archived_at IS NULL
    ORDER BY id`;
}

export class TierFullError extends Error {}

export async function addHabit(athleteId: string, tier: Tier, title: string): Promise<Habit> {
  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM habits
    WHERE athlete_id = ${athleteId} AND tier = ${tier} AND archived_at IS NULL`;
  if (n >= TIER_MAX) throw new TierFullError();
  const [row] = await sql<Habit[]>`
    INSERT INTO habits (athlete_id, tier, title) VALUES (${athleteId}, ${tier}, ${title})
    RETURNING id::int AS id, tier, title`;
  return row;
}

/** Removed habits are archived so past days still show what was done. */
export async function removeHabit(athleteId: string, id: number) {
  const sql = await db();
  await sql`
    UPDATE habits SET archived_at = now()
    WHERE id = ${id} AND athlete_id = ${athleteId} AND archived_at IS NULL`;
}

type DayRow = { checked: number[]; sleep_hours: number | null };

async function getDay(athleteId: string, day: string): Promise<DayRow> {
  const sql = await db();
  const [row] = await sql<DayRow[]>`
    SELECT checked, sleep_hours FROM habit_days WHERE athlete_id = ${athleteId} AND day = ${day}`;
  return row ?? { checked: [], sleep_hours: null };
}

/** Writes a day's row, recomputing its counts from the current habits. */
async function saveDay(athleteId: string, day: string, checked: number[], sleep: number | null) {
  const habits = await activeHabits(athleteId);
  const live = new Set(habits.map((h) => h.id));
  const kept = [...new Set(checked)].filter((id) => live.has(id));
  const counts = dayCounts(habits, kept);
  const sql = await db();
  await sql`
    INSERT INTO habit_days (athlete_id, day, checked, counts, sleep_hours)
    VALUES (${athleteId}, ${day}, ${sql.json(kept)}, ${sql.json(counts)}, ${sleep})
    ON CONFLICT (athlete_id, day) DO UPDATE SET
      checked = EXCLUDED.checked, counts = EXCLUDED.counts,
      sleep_hours = EXCLUDED.sleep_hours, updated_at = now()`;
  return { checked: kept, counts };
}

export async function today(athleteId: string, day: string) {
  const row = await getDay(athleteId, day);
  return { checked: row.checked, sleep: row.sleep_hours };
}

export async function setChecked(athleteId: string, day: string, habitId: number, done: boolean) {
  const row = await getDay(athleteId, day);
  const checked = done ? [...row.checked, habitId] : row.checked.filter((id) => id !== habitId);
  return saveDay(athleteId, day, checked, row.sleep_hours);
}

export async function setSleep(athleteId: string, day: string, hours: number) {
  const row = await getDay(athleteId, day);
  return saveDay(athleteId, day, row.checked, hours);
}

/** After adding or removing a habit, today's totals follow the new list. */
export async function refreshDay(athleteId: string, day: string) {
  const row = await getDay(athleteId, day);
  return saveDay(athleteId, day, row.checked, row.sleep_hours);
}

/** The last `days` days before today, newest first (today itself is the checklist). */
export async function habitLog(athleteId: string, today: string, days = 30): Promise<LogDay[]> {
  const sql = await db();
  const rows = await sql<{ day: string; checked: number[]; counts: DayCounts; sleep_hours: number | null }[]>`
    SELECT to_char(day, 'YYYY-MM-DD') AS day, checked, counts, sleep_hours
    FROM habit_days
    WHERE athlete_id = ${athleteId} AND day < ${today}::date AND day >= ${today}::date - ${days}::int`;
  const titles = new Map(
    (
      await sql<{ id: number; title: string }[]>`
        SELECT id::int AS id, title FROM habits WHERE athlete_id = ${athleteId}`
    ).map((h) => [h.id, h.title]),
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: LogDay[] = [];
  const base = new Date(`${today}T12:00:00Z`);
  for (let i = 1; i <= days; i++) {
    const d = new Date(base.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    out.push({
      day: d,
      counts: r && Object.keys(r.counts).length ? r.counts : null,
      checked: r ? r.checked.map((id) => titles.get(id) ?? "").filter(Boolean) : [],
      sleep: r?.sleep_hours ?? null,
    });
  }
  return out;
}
