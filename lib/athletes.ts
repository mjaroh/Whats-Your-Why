import "server-only";
import { db } from "./db";

export type Athlete = {
  id: string;
  first_name: string | null;
  username: string | null;
  banned_at: Date | null;
  age_confirmed_at: Date | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  current_period_end: Date | null;
};

export type Why = {
  statement: string;
  answers: { question: string; answer: string }[];
};

export type CoachMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "checkin";
  created_at: Date;
};

export function isMember(a: Athlete | null): boolean {
  return a?.subscription_status === "active" || a?.subscription_status === "trialing";
}

export async function getAthlete(id: string): Promise<Athlete | null> {
  const sql = await db();
  const [row] = await sql<Athlete[]>`
    SELECT id, first_name, username, banned_at, age_confirmed_at, stripe_customer_id,
           subscription_status, current_period_end
    FROM athletes WHERE id = ${id}`;
  return row ?? null;
}

/** Account is ready once the athlete confirmed 13+ and picked a username. */
export function isSetUp(a: Athlete | null): boolean {
  return Boolean(a?.age_confirmed_at && a.username);
}

/** Throws UsernameTakenError if someone else has the username. */
export async function setupAthlete(id: string, firstName: string | null, username: string) {
  const sql = await db();
  try {
    await sql`
      INSERT INTO athletes (id, first_name, username, age_confirmed_at)
      VALUES (${id}, ${firstName}, ${username}, now())
      ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, athletes.first_name),
        username = EXCLUDED.username,
        age_confirmed_at = COALESCE(athletes.age_confirmed_at, now())`;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new UsernameTakenError();
    throw err;
  }
}

export class UsernameTakenError extends Error {}

export async function getWhy(athleteId: string): Promise<Why | null> {
  const sql = await db();
  const [row] = await sql<Why[]>`
    SELECT statement, answers FROM whys WHERE athlete_id = ${athleteId}`;
  return row ?? null;
}

export async function saveWhy(athleteId: string, why: Why) {
  const sql = await db();
  await sql`
    INSERT INTO whys (athlete_id, statement, answers)
    VALUES (${athleteId}, ${why.statement}, ${sql.json(why.answers)})
    ON CONFLICT (athlete_id) DO UPDATE SET
      statement = EXCLUDED.statement, answers = EXCLUDED.answers, updated_at = now()`;
}

export async function recentMessages(athleteId: string, limit = 40): Promise<CoachMessage[]> {
  const sql = await db();
  const rows = await sql<CoachMessage[]>`
    SELECT id::int AS id, role, content, kind, created_at
    FROM coach_messages WHERE athlete_id = ${athleteId}
    ORDER BY id DESC LIMIT ${limit}`;
  return rows.reverse();
}

export async function addMessage(
  athleteId: string,
  role: "user" | "assistant",
  content: string,
  kind: "chat" | "checkin" = "chat",
) {
  const sql = await db();
  await sql`
    INSERT INTO coach_messages (athlete_id, role, content, kind)
    VALUES (${athleteId}, ${role}, ${content}, ${kind})`;
}

/** Stores today's check-in once; returns false if one already exists for that date. */
export async function addCheckin(athleteId: string, content: string, localDate: string) {
  const sql = await db();
  const rows = await sql`
    INSERT INTO coach_messages (athlete_id, role, content, kind, checkin_date)
    VALUES (${athleteId}, 'assistant', ${content}, 'checkin', ${localDate})
    ON CONFLICT (athlete_id, checkin_date) WHERE checkin_date IS NOT NULL DO NOTHING
    RETURNING id`;
  return rows.length > 0;
}

export async function hasCheckin(athleteId: string, localDate: string) {
  const sql = await db();
  const [row] = await sql`
    SELECT 1 FROM coach_messages
    WHERE athlete_id = ${athleteId} AND checkin_date = ${localDate}`;
  return Boolean(row);
}

export async function updateSubscription(fields: {
  athleteId?: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
}) {
  const sql = await db();
  if (fields.athleteId) {
    await sql`
      UPDATE athletes SET stripe_customer_id = ${fields.customerId},
        subscription_id = ${fields.subscriptionId},
        subscription_status = ${fields.status},
        current_period_end = ${fields.currentPeriodEnd}
      WHERE id = ${fields.athleteId}`;
  } else {
    await sql`
      UPDATE athletes SET subscription_id = ${fields.subscriptionId},
        subscription_status = ${fields.status},
        current_period_end = ${fields.currentPeriodEnd}
      WHERE stripe_customer_id = ${fields.customerId}`;
  }
}
