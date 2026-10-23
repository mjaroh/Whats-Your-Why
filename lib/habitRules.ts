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

/**
 * A must do missed this many days in a row gets the coach's "get back up"
 * (Proverbs 24:16) on the day after: miss 7, hear it on day 8.
 */
export const MISSED_RUN_DAYS = 7;
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
 * - "none": sleep not logged yet, whatever else is checked (red)
 * - "started": sleep logged, but not every must do (yellow)
 * - "musts": every must do done (green)
 * - "done": every habit done and sleep logged (grayed out)
 * - "unset": no habits yet
 */
export type TodayStatus = "unset" | "none" | "started" | "musts" | "done";

export function todayStatus(habits: Habit[], checked: number[], sleep: number | null): TodayStatus {
  if (habits.length === 0) return "unset";
  if (sleep === null) return "none";
  const done = new Set(checked);
  const musts = habits.filter((h) => h.tier === "must");
  if (!musts.every((h) => done.has(h.id))) return "started";
  if (habits.every((h) => done.has(h.id))) return "done";
  return "musts";
}

/** YYYY-MM-DD plus n days (calendar math, no time zones). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The rows of the habit grid, oldest first.
 * - "month": every day of today's month, including the days still to come.
 * - "total": from the first tracked day through today (one more row each day).
 */
export function gridDays(mode: "month" | "total", today: string, first: string | null): string[] {
  const out: string[] = [];
  if (mode === "month") {
    let d = `${today.slice(0, 7)}-01`;
    while (d.slice(0, 7) === today.slice(0, 7)) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }
  let d = first && first < today ? first : today;
  while (d <= today) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/** How far back the log can be edited. */
export const EDIT_DAYS_BACK = 62;

/** A day can be edited if it's today or within the last couple of months, never the future. */
export function canEditDay(day: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today && day >= addDays(today, -EDIT_DAYS_BACK);
}

export type TrackedDay = { day: string; checked: number[]; sleep: number | null };

const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

/**
 * The athlete's habit tracker and sleep, written out for the coach.
 * `days` runs oldest to newest and ends with today; missing days count as
 * not tracked. Returns null when there's nothing to say yet.
 */
export function describeHabits(
  habits: (Habit & { since?: string })[],
  days: TrackedDay[],
  today: string,
): string | null {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const window: string[] = [];
  for (let i = 13; i >= 0; i--) window.push(addDays(today, -i));
  const logged = window.filter((d) => byDay.has(d));
  if (habits.length === 0 && !days.some((d) => d.sleep !== null)) return null;

  const lines: string[] = [];
  const t = byDay.get(today);
  const done = new Set(t?.checked ?? []);
  const musts = habits.filter((h) => h.tier === "must");
  lines.push(
    `Today (${fmtDay(today, { weekday: "long", month: "short", day: "numeric" })}): ` +
      `${t?.sleep != null ? `slept ${sleepLabel(t.sleep)} last night` : "sleep not logged yet"}; ` +
      `${musts.filter((h) => done.has(h.id)).length} of ${musts.length} must dos done so far.`,
  );

  if (habits.length) {
    lines.push("", `Habits over the last 14 days (${logged.length} of 14 days opened the tracker):`);
    for (const tier of TIERS) {
      const inTier = habits.filter((h) => h.tier === tier);
      if (!inTier.length) continue;
      lines.push(`${TIER_LABEL[tier]}:`);
      for (const h of inTier) {
        const count = window.filter((d) => byDay.get(d)?.checked.includes(h.id)).length;
        // Streak counts back from yesterday, plus today if it's already done.
        let streak = 0;
        for (let i = done.has(h.id) ? 0 : 1; i < 60; i++) {
          if (byDay.get(addDays(today, -i))?.checked.includes(h.id)) streak++;
          else break;
        }
        lines.push(
          `- ${h.title}: done ${count} of 14 days` +
            `${done.has(h.id) ? ", done today" : ""}${streak >= 2 ? `, ${streak}-day streak` : ""}`,
        );
      }
    }
  }

  // Must dos missed every day for the last week (counted back from yesterday, and
  // only over days the habit existed), so today is day 8 or later without it.
  const fallen = musts.flatMap((h) => {
    if (done.has(h.id)) return [];
    const since = h.since;
    let run = 0;
    for (let i = 1; i <= 60; i++) {
      const d = addDays(today, -i);
      if ((since && d < since) || byDay.get(d)?.checked.includes(h.id)) break;
      run++;
    }
    return run >= MISSED_RUN_DAYS
      ? [`- ${h.title}: missed the last ${run >= 60 ? "60+" : run} days in a row, and not done yet today`]
      : [];
  });
  if (fallen.length)
    lines.push("", `Must dos not done in over a week (today is day ${MISSED_RUN_DAYS + 1} or later):`, ...fallen);

  const nights = window.map((d) => ({ d, h: byDay.get(d)?.sleep ?? null })).filter((n) => n.h !== null);
  if (nights.length) {
    const avg = nights.reduce((s, n) => s + n.h!, 0) / nights.length;
    lines.push(
      "",
      `Sleep over the last 14 days: ${nights.length} nights logged, average ${avg.toFixed(1)} hrs.`,
      `Recent nights: ${nights
        .slice(-7)
        .reverse()
        .map((n) => `${fmtDay(n.d, { month: "short", day: "numeric" })} ${sleepLabel(n.h!)}`)
        .join(", ")}.`,
    );
  } else {
    lines.push("", "Sleep: nothing logged in the last 14 days.");
  }
  return lines.join("\n");
}
