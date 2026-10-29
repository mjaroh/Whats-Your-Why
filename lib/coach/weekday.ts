// Check-ins often open with the day ("Saturday, good day to…"). The model is
// told the day, but now and then names another one (the voice guide's
// examples mention a Saturday meet), so the opening is checked here.

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const OPENING = new RegExp(`^\\W*(?:(?:it'?s|it is|happy|this)\\s+)?(${DAYS.join("|")})\\b`, "i");

/** The weekday a check-in opens with, if it names one ("Saturday, …", "It's Friday…"). */
export function openingWeekday(text: string): string | null {
  const m = text.match(OPENING);
  return m ? DAYS.find((d) => d.toLowerCase() === m[1].toLowerCase())! : null;
}

/** True when the check-in opens by naming a day that isn't today. */
export function opensWithWrongDay(text: string, weekday: string): boolean {
  const named = openingWeekday(text);
  return named !== null && named.toLowerCase() !== weekday.toLowerCase();
}

/** Puts today's name in place of a wrong opening day. */
export function fixOpeningDay(text: string, weekday: string): string {
  const named = openingWeekday(text);
  if (!named || named.toLowerCase() === weekday.toLowerCase()) return text;
  return text.replace(new RegExp(`\\b${named}\\b`, "i"), weekday);
}
