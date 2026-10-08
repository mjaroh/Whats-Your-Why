// LA 2028: the countdown on the profile, for athletes in a Summer Olympic sport.

/** Midnight at the start of July 14, 2028 in Los Angeles (PDT, UTC-7). */
export const LA28_START = Date.UTC(2028, 6, 14, 7, 0, 0);

// Sports on the LA 2028 program, matched against the sport an athlete picked
// or typed. Ice hockey, cheer, dance, calisthenics and bodybuilding aren't on
// it; "Hockey" alone is read as ice hockey, so only "field hockey" counts.
const OLYMPIC = [
  "gymnastics",
  "trampoline",
  "basketball",
  "soccer",
  "baseball",
  "softball",
  "volleyball",
  "track",
  "athletics",
  "sprint",
  "hurdles",
  "javelin",
  "pole vault",
  "shot put",
  "discus",
  "marathon",
  "swimming",
  "diving",
  "water polo",
  "artistic swimming",
  "wrestling",
  "tennis",
  "table tennis",
  "lacrosse",
  "golf",
  "martial arts",
  "judo",
  "taekwondo",
  "boxing",
  "fencing",
  "weightlifting",
  "olympic lifting",
  "rowing",
  "canoe",
  "kayak",
  "cycling",
  "bmx",
  "mountain bike",
  "archery",
  "shooting",
  "sailing",
  "triathlon",
  "pentathlon",
  "handball",
  "rugby",
  "badminton",
  "equestrian",
  "surfing",
  "skateboarding",
  "climbing",
  "squash",
  "cricket",
  "flag football",
  "field hockey",
];

export function isSummerOlympicSport(sport: string | null | undefined): boolean {
  if (!sport) return false;
  const s = sport.toLowerCase().replace(/&/g, " and ");
  return OLYMPIC.some((o) => s.includes(o));
}

/** Days, hours, minutes and seconds until LA 2028 starts (all zero once it has). */
export function untilLA28(now: number) {
  const left = Math.max(0, Math.floor((LA28_START - now) / 1000));
  return {
    done: left === 0,
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3_600),
    minutes: Math.floor((left % 3_600) / 60),
    seconds: left % 60,
  };
}
