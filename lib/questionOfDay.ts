import "server-only";
import { generateGroupCheckin } from "./coach/claude";
import { localDay } from "./coach/time";
import { addGroupCheckin, groupCheckinFor, recentGroupCheckins } from "./group";

const GROUP_TZ = process.env.GROUP_TIMEZONE || "America/New_York";

/**
 * Today's question: the group's daily check-in, written by the coach the
 * first time anyone needs it that day. Shown in the group chat and on the
 * opening screen.
 */
export async function todaysQuestion(): Promise<string | null> {
  const { date, weekday } = localDay(GROUP_TZ);
  const existing = await groupCheckinFor(date);
  if (existing) return existing;
  try {
    await addGroupCheckin(date, await generateGroupCheckin(weekday, await recentGroupCheckins()));
  } catch (err) {
    console.error("group check-in failed", err);
  }
  return groupCheckinFor(date);
}
