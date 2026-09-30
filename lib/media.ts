import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";

export type MediaPurpose = "coach" | "group";

export type Media = {
  id: number;
  athlete_id: string;
  purpose: MediaPurpose;
  pathname: string;
  poster_pathname: string | null;
  content_type: string;
  duration_s: number | null;
  status: "uploading" | "ready" | "rejected";
};

const EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Reserves a pathname for a video the athlete is about to upload. */
export async function reserveVideo(
  athleteId: string,
  purpose: MediaPurpose,
  contentType: string,
  durationS: number,
): Promise<{ id: number; pathname: string }> {
  const sql = await db();
  const pathname = `videos/${athleteId}/${randomUUID()}.${EXT[contentType] ?? "mp4"}`;
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO media (athlete_id, purpose, pathname, content_type, duration_s)
    VALUES (${athleteId}, ${purpose}, ${pathname}, ${contentType}, ${durationS})
    RETURNING id::int AS id`;
  return { id: row.id, pathname };
}

const MEDIA_COLUMNS = "id::int AS id, athlete_id, purpose, pathname, poster_pathname, content_type, duration_s, status";

export async function getMedia(id: number): Promise<Media | null> {
  const sql = await db();
  const [row] = await sql<Media[]>`SELECT ${sql.unsafe(MEDIA_COLUMNS)} FROM media WHERE id = ${id}`;
  return row ?? null;
}

export async function uploadingByPathname(pathname: string, athleteId: string): Promise<Media | null> {
  const sql = await db();
  const [row] = await sql<Media[]>`
    SELECT ${sql.unsafe(MEDIA_COLUMNS)} FROM media
    WHERE pathname = ${pathname} AND athlete_id = ${athleteId} AND status = 'uploading'`;
  return row ?? null;
}

export async function markReady(id: number, posterPathname: string) {
  const sql = await db();
  await sql`UPDATE media SET status = 'ready', poster_pathname = ${posterPathname} WHERE id = ${id}`;
}

export async function markRejected(id: number) {
  const sql = await db();
  await sql`UPDATE media SET status = 'rejected' WHERE id = ${id}`;
}

/**
 * Who may watch: the athlete who posted it, admins, and (for group videos an
 * admin approved and nobody removed) any athlete with an account.
 */
export async function canView(media: Media, viewerId: string, admin: boolean): Promise<boolean> {
  if (media.athlete_id === viewerId || admin) return true;
  if (media.purpose !== "group" || media.status !== "ready") return false;
  const sql = await db();
  const [row] = await sql`
    SELECT 1 FROM group_messages
    WHERE media_id = ${media.id} AND approved_at IS NOT NULL AND hidden_at IS NULL`;
  return Boolean(row);
}

// ── Coach videos on the profile ─────────────────────────────────────────

export type CoachVideo = {
  media_id: number;
  message_id: number;
  note: string;
  created_at: Date;
  feedback: string | null;
};

export async function coachVideos(athleteId: string): Promise<CoachVideo[]> {
  const sql = await db();
  return sql<CoachVideo[]>`
    SELECT m.media_id::int AS media_id, m.id::int AS message_id, m.content AS note, m.created_at,
      (SELECT r.content FROM coach_messages r
        WHERE r.athlete_id = m.athlete_id AND r.role = 'assistant' AND r.id > m.id
        ORDER BY r.id LIMIT 1) AS feedback
    FROM coach_messages m JOIN media x ON x.id = m.media_id
    WHERE m.athlete_id = ${athleteId} AND x.status = 'ready'
    ORDER BY m.id DESC`;
}

// ── Profile photos ──────────────────────────────────────────────────────

export async function setAvatar(athleteId: string, pathname: string): Promise<string | null> {
  const sql = await db();
  const [prev] = await sql<{ avatar_pathname: string | null }[]>`
    SELECT avatar_pathname FROM athletes WHERE id = ${athleteId}`;
  await sql`UPDATE athletes SET avatar_pathname = ${pathname} WHERE id = ${athleteId}`;
  return prev?.avatar_pathname ?? null;
}

export async function avatarForUsername(username: string): Promise<string | null> {
  const sql = await db();
  const [row] = await sql<{ avatar_pathname: string | null }[]>`
    SELECT avatar_pathname FROM athletes
    WHERE lower(username) = lower(${username}) AND banned_at IS NULL`;
  return row?.avatar_pathname ?? null;
}

/** Admin: clears the photo of whoever wrote a group message. Returns the old pathname. */
export async function removeAvatarByMessage(messageId: number): Promise<string | null> {
  const sql = await db();
  const [row] = await sql<{ avatar_pathname: string | null }[]>`
    UPDATE athletes a SET avatar_pathname = NULL
    FROM athletes old, group_messages g
    WHERE g.id = ${messageId} AND a.id = g.athlete_id AND old.id = a.id
    RETURNING old.avatar_pathname`;
  return row?.avatar_pathname ?? null;
}

// ── Saved messages ──────────────────────────────────────────────────────

export type FavoriteSource = "coach" | "group";

/** Only messages the athlete can see can be saved. */
export async function setFavorite(athleteId: string, source: FavoriteSource, messageId: number, on: boolean) {
  const sql = await db();
  if (!on) {
    await sql`
      DELETE FROM favorites
      WHERE athlete_id = ${athleteId} AND source = ${source} AND message_id = ${messageId}`;
    return true;
  }
  const [visible] =
    source === "coach"
      ? await sql`SELECT 1 FROM coach_messages WHERE id = ${messageId} AND athlete_id = ${athleteId}`
      : await sql`
          SELECT 1 FROM group_messages
          WHERE id = ${messageId} AND hidden_at IS NULL AND approved_at IS NOT NULL`;
  if (!visible) return false;
  await sql`
    INSERT INTO favorites (athlete_id, source, message_id)
    VALUES (${athleteId}, ${source}, ${messageId}) ON CONFLICT DO NOTHING`;
  return true;
}

export async function favoriteIds(athleteId: string, source: FavoriteSource): Promise<number[]> {
  const sql = await db();
  const rows = await sql<{ message_id: number }[]>`
    SELECT message_id::int AS message_id FROM favorites
    WHERE athlete_id = ${athleteId} AND source = ${source}`;
  return rows.map((r) => r.message_id);
}

export type Favorite = {
  source: FavoriteSource;
  message_id: number;
  from: string;
  content: string;
  media_id: number | null;
  saved_at: Date;
};

export async function listFavorites(athleteId: string): Promise<Favorite[]> {
  const sql = await db();
  return sql<Favorite[]>`
    SELECT f.source, f.message_id::int AS message_id, f.created_at AS saved_at,
      CASE WHEN f.source = 'coach' THEN
        CASE WHEN c.kind = 'checkin' THEN 'Coach · check-in' ELSE 'Coach' END
      ELSE COALESCE(a.username, 'Askesis') END AS "from",
      COALESCE(c.content, g.content) AS content,
      COALESCE(c.media_id, g.media_id)::int AS media_id
    FROM favorites f
    LEFT JOIN coach_messages c ON f.source = 'coach' AND c.id = f.message_id AND c.athlete_id = f.athlete_id
    LEFT JOIN group_messages g ON f.source = 'group' AND g.id = f.message_id
      AND g.hidden_at IS NULL AND g.approved_at IS NOT NULL
    LEFT JOIN athletes a ON a.id = g.athlete_id
    WHERE f.athlete_id = ${athleteId} AND (c.id IS NOT NULL OR g.id IS NOT NULL)
    ORDER BY f.created_at DESC`;
}
