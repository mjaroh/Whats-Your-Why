import "server-only";
import { db } from "./db";

export type GroupMessage = {
  id: number;
  athlete_id: string | null;
  username: string | null;
  kind: "chat" | "checkin";
  content: string;
  created_at: Date;
};

/** A message is hidden once this many different athletes report it. */
export const AUTO_HIDE_REPORTS = 3;

export async function groupMessages(opts: { after?: number; limit?: number } = {}) {
  const sql = await db();
  const rows = await sql<GroupMessage[]>`
    SELECT m.id::int AS id, m.athlete_id, a.username, m.kind, m.content, m.created_at
    FROM group_messages m LEFT JOIN athletes a ON a.id = m.athlete_id
    WHERE m.hidden_at IS NULL AND m.id > ${opts.after ?? 0}
    ORDER BY m.id DESC LIMIT ${opts.limit ?? 100}`;
  return rows.reverse();
}

/** Ids among recent messages that have been hidden since they were loaded. */
export async function recentlyHidden(sinceId: number): Promise<number[]> {
  const sql = await db();
  const rows = await sql<{ id: number }[]>`
    SELECT id::int AS id FROM group_messages
    WHERE hidden_at IS NOT NULL AND id >= ${sinceId}`;
  return rows.map((r) => r.id);
}

export async function postGroupMessage(athleteId: string, content: string): Promise<GroupMessage> {
  const sql = await db();
  const [row] = await sql<GroupMessage[]>`
    WITH m AS (
      INSERT INTO group_messages (athlete_id, content) VALUES (${athleteId}, ${content})
      RETURNING id, athlete_id, kind, content, created_at
    )
    SELECT m.id::int AS id, m.athlete_id, a.username, m.kind, m.content, m.created_at
    FROM m LEFT JOIN athletes a ON a.id = m.athlete_id`;
  return row;
}

export async function recentForContext(limit = 8) {
  const msgs = await groupMessages({ limit });
  return msgs.map((m) => ({ username: m.username ?? "Askesis", content: m.content }));
}

export async function hasGroupCheckin(date: string) {
  const sql = await db();
  const [row] = await sql`SELECT 1 FROM group_messages WHERE checkin_date = ${date}`;
  return Boolean(row);
}

export async function addGroupCheckin(date: string, content: string) {
  const sql = await db();
  await sql`
    INSERT INTO group_messages (kind, content, checkin_date)
    VALUES ('checkin', ${content}, ${date})
    ON CONFLICT (checkin_date) DO NOTHING`;
}

export async function recentGroupCheckins(limit = 7): Promise<string[]> {
  const sql = await db();
  const rows = await sql<{ content: string }[]>`
    SELECT content FROM group_messages WHERE kind = 'checkin'
    ORDER BY id DESC LIMIT ${limit}`;
  return rows.map((r) => r.content);
}

export async function reportMessage(messageId: number, reporterId: string) {
  const sql = await db();
  await sql`
    INSERT INTO group_reports (message_id, reporter_id) VALUES (${messageId}, ${reporterId})
    ON CONFLICT DO NOTHING`;
  // Enough independent reports hide it until an admin looks.
  await sql`
    UPDATE group_messages SET hidden_at = now(), hidden_reason = 'reports'
    WHERE id = ${messageId} AND hidden_at IS NULL AND kind = 'chat'
      AND (SELECT count(*) FROM group_reports
           WHERE message_id = ${messageId} AND resolved_at IS NULL) >= ${AUTO_HIDE_REPORTS}`;
}

// ── Admin ────────────────────────────────────────────────────────────────

export type ReportedMessage = {
  id: number;
  username: string | null;
  content: string;
  reports: number;
  hidden: boolean;
  created_at: Date;
};

export async function openReports(): Promise<ReportedMessage[]> {
  const sql = await db();
  return sql<ReportedMessage[]>`
    SELECT m.id::int AS id, a.username, m.content,
           count(r.*)::int AS reports, (m.hidden_at IS NOT NULL) AS hidden, m.created_at
    FROM group_reports r
    JOIN group_messages m ON m.id = r.message_id
    LEFT JOIN athletes a ON a.id = m.athlete_id
    WHERE r.resolved_at IS NULL
    GROUP BY m.id, a.username
    ORDER BY max(r.created_at) DESC`;
}

export async function deleteMessage(messageId: number) {
  const sql = await db();
  await sql`UPDATE group_messages SET hidden_at = now(), hidden_reason = 'admin' WHERE id = ${messageId}`;
  await sql`UPDATE group_reports SET resolved_at = now() WHERE message_id = ${messageId}`;
}

/** Report was wrong: resolve it and put the message back if reports hid it. */
export async function dismissReports(messageId: number) {
  const sql = await db();
  await sql`UPDATE group_reports SET resolved_at = now() WHERE message_id = ${messageId}`;
  await sql`
    UPDATE group_messages SET hidden_at = NULL, hidden_reason = NULL
    WHERE id = ${messageId} AND hidden_reason = 'reports'`;
}

export async function authorOf(messageId: number): Promise<string | null> {
  const sql = await db();
  const [row] = await sql<{ athlete_id: string | null }[]>`
    SELECT athlete_id FROM group_messages WHERE id = ${messageId}`;
  return row?.athlete_id ?? null;
}

/** Bans the account and hides everything it posted. */
export async function banAthlete(athleteId: string) {
  const sql = await db();
  await sql`UPDATE athletes SET banned_at = now() WHERE id = ${athleteId}`;
  await sql`
    UPDATE group_messages SET hidden_at = now(), hidden_reason = 'banned'
    WHERE athlete_id = ${athleteId} AND hidden_at IS NULL`;
  await sql`
    UPDATE group_reports SET resolved_at = now()
    WHERE message_id IN (SELECT id FROM group_messages WHERE athlete_id = ${athleteId})`;
}

export type CrisisEvent = {
  id: number;
  created_at: Date;
  source: string;
  category: string | null;
  message: string;
  username: string | null;
};

export async function openCrisisEvents(): Promise<CrisisEvent[]> {
  const sql = await db();
  return sql<CrisisEvent[]>`
    SELECT c.id::int AS id, c.created_at, c.source, c.category, c.message, a.username
    FROM crisis_events c LEFT JOIN athletes a ON a.id = c.athlete_id
    WHERE c.reviewed_at IS NULL ORDER BY c.id DESC LIMIT 100`;
}

export async function markCrisisReviewed(id: number) {
  const sql = await db();
  await sql`UPDATE crisis_events SET reviewed_at = now() WHERE id = ${id}`;
}
