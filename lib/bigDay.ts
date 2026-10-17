// The athlete's "big day": a date and a name for it (state meet, tryouts,
// first game), counted down on their profile.
import { addDays } from "./habitRules.ts";

export const BIG_DAY_TITLE_MAX = 40;

export function cleanBigDayTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value
    .replace(/[\u0000-\u001f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.slice(0, BIG_DAY_TITLE_MAX) : null;
}

/** A real calendar date in YYYY-MM-DD form. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Midnight at the start of the big day, in the viewer's own time zone. */
export function bigDayStart(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** One line for the coach: what the day is and how far away it is. */
export function describeBigDay(title: string, date: string, today: string): string {
  const when = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  let n = 0;
  if (date > today) while (addDays(today, n) < date && n < 4000) n++;
  else while (addDays(date, n) < today && n < 4000) n++;
  const gap =
    date === today
      ? "it's today"
      : date > today
        ? `${n} day${n === 1 ? "" : "s"} away`
        : `${n} day${n === 1 ? "" : "s"} ago`;
  return `Their big day: "${title}" on ${when} (${gap}).`;
}
