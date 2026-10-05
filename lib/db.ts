import "server-only";
import postgres from "postgres";

// Works with any Postgres (Neon from the Vercel Marketplace, Supabase, ...).
// The free Seven Whys never stores answers. Account holders' whys, group chat
// posts and (for paying members) coach conversations are stored against their
// account.

let sql: postgres.Sql | null = null;
let schemaReady: Promise<void> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function db(): Promise<postgres.Sql> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      prepare: false, // compatible with transaction-mode poolers (Supabase, Neon)
    });
  }
  schemaReady ??= ensureSchema(sql).catch((err) => {
    schemaReady = null;
    throw err;
  });
  await schemaReady;
  return sql;
}

async function ensureSchema(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS signups (
      id BIGSERIAL PRIMARY KEY,
      parent_email TEXT NOT NULL,
      athlete_first_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS crisis_events (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      source TEXT NOT NULL,
      category TEXT,
      question_number INT,
      message TEXT NOT NULL,
      ip_hash TEXT,
      reviewed_at TIMESTAMPTZ
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS athletes (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      age_confirmed_at TIMESTAMPTZ,
      stripe_customer_id TEXT UNIQUE,
      subscription_id TEXT,
      subscription_status TEXT,
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS whys (
      athlete_id TEXT PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
      statement TEXT NOT NULL,
      answers JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS coach_messages (
      id BIGSERIAL PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'chat',
      checkin_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS coach_messages_athlete ON coach_messages (athlete_id, id)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS coach_messages_one_checkin
    ON coach_messages (athlete_id, checkin_date) WHERE checkin_date IS NOT NULL`;
  await sql`ALTER TABLE crisis_events ADD COLUMN IF NOT EXISTS athlete_id TEXT`;
  await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS username TEXT`;
  await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS athletes_username
    ON athletes (lower(username)) WHERE username IS NOT NULL`;
  await sql`
    CREATE TABLE IF NOT EXISTS group_messages (
      id BIGSERIAL PRIMARY KEY,
      athlete_id TEXT REFERENCES athletes(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'chat',
      content TEXT NOT NULL,
      checkin_date DATE UNIQUE,
      hidden_at TIMESTAMPTZ,
      hidden_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS media (
      id BIGSERIAL PRIMARY KEY,
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      pathname TEXT NOT NULL UNIQUE,
      poster_pathname TEXT,
      content_type TEXT NOT NULL,
      duration_s REAL,
      status TEXT NOT NULL DEFAULT 'uploading',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`ALTER TABLE coach_messages ADD COLUMN IF NOT EXISTS media_id BIGINT REFERENCES media(id)`;
  await sql`ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS media_id BIGINT REFERENCES media(id)`;
  // Text posts are approved on insert; group videos wait for an admin.
  await sql`ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT now()`;
  await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS avatar_pathname TEXT`;
  await sql`ALTER TABLE whys ADD COLUMN IF NOT EXISTS sport TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      athlete_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      message_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (athlete_id, source, message_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS group_reports (
      message_id BIGINT NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
      reporter_id TEXT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (message_id, reporter_id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INT NOT NULL
    )`;
}
