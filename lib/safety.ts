import "server-only";
import { db, hasDatabase } from "./db";

export type CrisisSource = "keyword" | "classifier" | "model";

/**
 * Records a crisis stop for human review. Only the message that triggered the
 * stop is kept (reviewers need it); the rest of the conversation is not.
 */
export async function logCrisisEvent(event: {
  source: CrisisSource;
  category: string | null;
  /** Seven Whys question number, or null for the coach. */
  questionNumber: number | "final" | null;
  message: string;
  ipHash: string;
  athleteId?: string;
}) {
  const qn = typeof event.questionNumber === "number" ? event.questionNumber : null;
  // Vercel log line without the message text, so logs stay free of content.
  console.warn(
    JSON.stringify({
      event: "crisis_stop",
      source: event.source,
      category: event.category,
      questionNumber: event.questionNumber,
      coach: Boolean(event.athleteId),
      at: new Date().toISOString(),
    }),
  );
  if (!hasDatabase()) {
    console.error("crisis_stop not persisted: DATABASE_URL is not set");
    return;
  }
  try {
    const sql = await db();
    await sql`
      INSERT INTO crisis_events (source, category, question_number, message, ip_hash, athlete_id)
      VALUES (${event.source}, ${event.category}, ${qn}, ${event.message}, ${event.ipHash},
              ${event.athleteId ?? null})`;
  } catch (err) {
    console.error("failed to persist crisis event", err);
  }
}
