// Habit tracker rules shared by the server and the app (no database here).

export const TIERS = ["must", "want", "wish"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  must: "Must do",
  want: "Want to do",
  wish: "Wish to do",
};

/** The fewest habits in each tier for a complete profile. */
export const TIER_MIN: Record<Tier, number> = { must: 3, want: 1, wish: 1 };
export const TIER_MAX = 8;
export const HABIT_MAX_CHARS = 60;
export const SLEEP_MAX = 12; // shown as "12+"

export type Habit = { id: number; tier: Tier; title: string };
/** Done / total per tier for one day. */
export type DayCounts = Record<Tier, [number, number]>;

export function habitsComplete(habits: { tier: Tier }[]): boolean {
  return TIERS.every((t) => habits.filter((h) => h.tier === t).length >= TIER_MIN[t]);
}

export function dayCounts(habits: Habit[], checked: number[]): DayCounts {
  const done = new Set(checked);
  const out = {} as DayCounts;
  for (const t of TIERS) {
    const inTier = habits.filter((h) => h.tier === t);
    out[t] = [inTier.filter((h) => done.has(h.id)).length, inTier.length];
  }
  return out;
}

/** Hours of sleep, rounded to the half hour and kept within 0–12. */
export function cleanSleep(hours: number): number {
  if (!Number.isFinite(hours)) return 0;
  return Math.min(SLEEP_MAX, Math.max(0, Math.round(hours * 2) / 2));
}

export function sleepLabel(hours: number): string {
  return hours >= SLEEP_MAX ? "12+ hrs" : `${hours} hr${hours === 1 ? "" : "s"}`;
}

export function cleanTitle(value: string): string {
  return value
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, HABIT_MAX_CHARS);
}

/**
 * How today is going, for the Habit tracker button on the profile:
 * - "none": nothing checked and no sleep logged yet (red)
 * - "started": something done, but not every must do (yellow)
 * - "musts": every must do done (green)
 * - "done": every habit done and sleep logged (grayed out)
 * - "unset": no habits yet
 */
export type TodayStatus = "unset" | "none" | "started" | "musts" | "done";

export function todayStatus(habits: Habit[], checked: number[], sleep: number | null): TodayStatus {
  if (habits.length === 0) return "unset";
  const done = new Set(checked);
  const any = habits.some((h) => done.has(h.id)) || sleep !== null;
  if (!any) return "none";
  const musts = habits.filter((h) => h.tier === "must");
  if (!musts.every((h) => done.has(h.id))) return "started";
  if (sleep !== null && habits.every((h) => done.has(h.id))) return "done";
  return "musts";
}
