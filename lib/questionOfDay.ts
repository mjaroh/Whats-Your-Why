import "server-only";
import { generateGroupCheckin } from "./coach/claude";
import { localDay } from "./coach/time";
import { backupQuestion } from "./backupQuestions";
import { addGroupCheckin, groupCheckinFor, recentGroupCheckins } from "./group";

const GROUP_TZ = process.env.GROUP_TIMEZONE || "America/New_York";

/**
 * Today's question: the group's daily check-in, written by the coach the
 * first time anyone needs it that day. Shown in the group chat and on the
 * opening screen. If the coach can't write it, a backup question is posted.
 */
export async function todaysQuestion(): Promise<string | null> {
  const { date, weekday } = localDay(GROUP_TZ);
  const existing = await groupCheckinFor(date);
  if (existing) return existing;
  const recent = await recentGroupCheckins();
  let question: string;
  try {
    question = await generateGroupCheckin(weekday, recent);
  } catch (err) {
    console.error("group check-in failed; posting a backup question", err);
    question = backupQuestion(date, recent);
  }
  await addGroupCheckin(date, question);
  return groupCheckinFor(date);
}
