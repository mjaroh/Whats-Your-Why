// The sport question that opens the Seven Whys. It tells the Seven Whys and
// the coach what world the athlete trains in, so they can speak its language.
export const SPORTS = [
  "Gymnastics",
  "Football",
  "Basketball",
  "Soccer",
  "Baseball",
  "Softball",
  "Volleyball",
  "Track & Field",
  "Cross Country",
  "Swimming",
  "Wrestling",
  "Tennis",
  "Hockey",
  "Lacrosse",
  "Cheer",
  "Dance",
  "Golf",
  "Martial Arts",
  "Calisthenics",
  "Lifter",
  "Bodybuilder",
] as const;

export const SPORT_MAX_CHARS = 40;

/** One line of plain text, or null. Anything typed under "Other" passes through here. */
export function cleanSport(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value
    .replace(/[\u0000-\u001f\[\]<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s.slice(0, SPORT_MAX_CHARS) : null;
}
