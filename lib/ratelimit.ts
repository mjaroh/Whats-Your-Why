import "server-only";
import { db, hasDatabase } from "./db";

// Fixed-window limiter. Uses Postgres when DATABASE_URL is set so the limit
// holds across serverless instances; falls back to per-instance memory.

const memory = new Map<string, { windowStart: number; count: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (hasDatabase()) {
    try {
      const sql = await db();
      const windowSecs = windowMs / 1000;
      const [row] = await sql<{ count: number }[]>`
        INSERT INTO rate_limits (key, window_start, count)
        VALUES (${key}, now(), 1)
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSecs})
            THEN 1 ELSE rate_limits.count + 1 END,
          window_start = CASE
            WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSecs})
            THEN now() ELSE rate_limits.window_start END
        RETURNING count`;
      return row.count <= limit;
    } catch (err) {
      console.error("rate limit db error; using memory", err);
    }
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    memory.set(key, { windowStart: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
