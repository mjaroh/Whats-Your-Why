import "server-only";
import postgres from "postgres";

// Works with any Postgres (Neon from the Vercel Marketplace, Supabase, ...).
// Only three things are ever written: waitlist signups, crisis events for
// human review, and rate-limit counters. Athlete answers are never stored.

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
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INT NOT NULL
    )`;
}
