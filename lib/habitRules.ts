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
