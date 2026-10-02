import "server-only";
import { db } from "./db";

export type GroupMessage = {
  id: number;
  athlete_id: string | null;
  username: string | null;
  has_avatar: boolean;
  kind: "chat" | "checkin";
  content: string;
  media_id: number | null;
  approved: boolean;
  created_at: Date;
};

const MESSAGE_COLUMNS = `m.id::int AS id, m.athlete_id, a.username, (a.avatar_pathname IS NOT NULL) AS has_avatar,
  m.kind, m.content, m.media_id::int AS media_id, (m.approved_at IS NOT NULL) AS approved, m.created_at`;

/** A message is hidden once this many different athletes report it. */
export const AUTO_HIDE_REPORTS = 3;

/**
 * Visible messages: approved and not removed. A viewer also sees their own
 * videos while they wait for approval.
 */
export async function groupMessages(opts: { after?: number; limit?: number; viewer?: string } = {}) {
  const sql = await db();
  const rows = await sql<GroupMessage[]>`
    SELECT ${sql.unsafe(MESSAGE_COLUMNS)}
    FROM group_messages m LEFT JOIN athletes a ON a.id = m.athlete_id
    WHERE m.hidden_at IS NULL AND m.id > ${opts.after ?? 0}
      AND (m.approved_at IS NOT NULL OR m.athlete_id = ${opts.viewer ?? ""})
    ORDER BY m.id DESC LIMIT ${opts.limit ?? 100}`;
  return rows.reverse();
}

/** Videos approved since a poll, so they show up for people already in the chat. */
export async function approvedSince(since: Date) {
  const sql = await db();
  return sql<GroupMessage[]>`
    SELECT ${sql.unsafe(MESSAGE_COLUMNS)}
    FROM group_messages m LEFT JOIN athletes a ON a.id = m.athlete_id
    WHERE m.hidden_at IS NULL AND m.media_id IS NOT NULL AND m.approved_at > ${since}
    ORDER BY m.id`;
}

/** Ids among recent messages that have been hidden since they were loaded. */
export async function recentlyHidden(sinceId: number): Promise<number[]> {
  const sql = await db();
  const rows = await sql<{ id: number }[]>`
    SELECT id::int AS id FROM group_messages
    WHERE hidden_at IS NOT NULL AND id >= ${sinceId}`;
  return rows.map((r) => r.id);
}

/** Text posts go live at once; a video waits for an admin (approved_at NULL). */
export async function postGroupMessage(
  athleteId: string,
  content: string,
  mediaId: number | null = null,
): Promise<GroupMessage> {
  const sql = await db();
  const approvedAt = mediaId ? null : new Date();
  const [row] = await sql<GroupMessage[]>`
    WITH m AS (
      INSERT INTO group_messages (athlete_id, content, media_id, approved_at)
      VALUES (${athleteId}, ${content}, ${mediaId}, ${approvedAt})
      RETURNING *
    )
    SELECT ${sql.unsafe(MESSAGE_COLUMNS)} FROM m LEFT JOIN athletes a ON a.id = m.athlete_id`;
  return row;
}

export async function recentForContext(limit = 8) {
  const msgs = (await groupMessages({ limit })).filter((m) => m.content);
  return msgs.map((m) => ({ username: m.username ?? "Askesis", content: m.content }));
}

export async function groupCheckinFor(date: string): Promise<string | null> {
  const sql = await db();
  const [row] = await sql<{ content: string }[]>`
    SELECT content FROM group_messages WHERE checkin_date = ${date}`;
  return row?.content ?? null;
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

export type PendingVideo = {
  id: number;
  media_id: number;
  username: string | null;
  content: string;
  created_at: Date;
};

export async function pendingVideos(): Promise<PendingVideo[]> {
  const sql = await db();
  return sql<PendingVideo[]>`
    SELECT m.id::int AS id, m.media_id::int AS media_id, a.username, m.content, m.created_at
    FROM group_messages m LEFT JOIN athletes a ON a.id = m.athlete_id
    WHERE m.media_id IS NOT NULL AND m.approved_at IS NULL AND m.hidden_at IS NULL
    ORDER BY m.id`;
}

export async function approveVideo(messageId: number) {
  const sql = await db();
  await sql`
    UPDATE group_messages SET approved_at = now()
    WHERE id = ${messageId} AND media_id IS NOT NULL AND approved_at IS NULL AND hidden_at IS NULL`;
}

/** Rejecting (or deleting) a video post also returns its files so they can be removed. */
export async function hideWithMedia(messageId: number, reason: string): Promise<(string | null)[]> {
  const sql = await db();
  await sql`
    UPDATE group_messages SET hidden_at = now(), hidden_reason = ${reason}
    WHERE id = ${messageId}`;
  await sql`UPDATE group_reports SET resolved_at = now() WHERE message_id = ${messageId}`;
  const [media] = await sql<{ pathname: string; poster_pathname: string | null }[]>`
    UPDATE media SET status = 'rejected'
    WHERE id = (SELECT media_id FROM group_messages WHERE id = ${messageId})
    RETURNING pathname, poster_pathname`;
  return media ? [media.pathname, media.poster_pathname] : [];
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
