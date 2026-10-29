// The app's color for the day, following the Orthodox Church year (fixed
// feasts on the civil/New calendar, Pascha by the Julian reckoning).
//
// The order decides which wins when days overlap:
//   1. Great Feasts (and Pascha): green
//   2. Great Lent and Holy Week: red
//   3. Nativity Fast (Nov 15 – Dec 24) and Dormition Fast (Aug 1 – 14): blue, for the Theotokos
//   4. Apostles' Fast: green
//   5. Sundays: gold
//   6. Wednesdays and Fridays, and the strict fasts of Aug 29 and Jan 5: burnt red
//      (not in the fast-free weeks)
//   7. Every other day: green
//
// `liturgicalSeason` must stay self-contained (no imports, no outside names):
// it's also written into the page head as a script, so the color is right
// before anything is drawn.

export type Season = "feast" | "lent" | "theotokos" | "sunday" | "fast" | "ordinary";

export function liturgicalSeason(now: Date): Season {
  const y = now.getFullYear();
  const day = (m: number, d: number, yr = y) => Date.UTC(yr, m - 1, d) / 864e5;
  const today = day(now.getMonth() + 1, now.getDate());
  const weekday = now.getDay();

  // Orthodox Pascha: the Julian computus, moved onto the civil calendar
  // (13 days apart from 1900 to 2099).
  const a = y % 4;
  const b = y % 7;
  const c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const pascha = day(Math.floor((d + e + 114) / 31), ((d + e + 114) % 31) + 1) + 13;
  const p = today - pascha;

  const feasts = [
    day(1, 6), // Theophany
    day(2, 2), // Meeting of the Lord
    day(3, 25), // Annunciation
    day(8, 6), // Transfiguration
    day(8, 15), // Dormition
    day(9, 8), // Nativity of the Theotokos
    day(9, 14), // Elevation of the Cross
    day(11, 21), // Entrance of the Theotokos
    day(12, 25), // Nativity of Christ
    pascha - 7, // Palm Sunday
    pascha, // Pascha
    pascha + 39, // Ascension
    pascha + 49, // Pentecost
  ];
  if (feasts.includes(today)) return "feast";
  if (p >= -48 && p <= -1) return "lent"; // Clean Monday through Holy Saturday
  if (today >= day(11, 15) && today <= day(12, 24)) return "theotokos";
  if (today >= day(8, 1) && today <= day(8, 14)) return "theotokos";
  if (p >= 57 && today <= day(6, 28)) return "ordinary"; // Apostles' Fast: Monday after All Saints to June 28
  if (weekday === 0) return "sunday";
  if (today === day(8, 29) || today === day(1, 5)) return "fast"; // Beheading of the Forerunner, Theophany Eve
  const fastFree =
    (p >= 1 && p <= 6) || // Bright Week
    (p >= 50 && p <= 56) || // the week after Pentecost
    (p >= -69 && p <= -64) || // the week after the Publican and the Pharisee
    today <= day(1, 4) ||
    today >= day(12, 25); // Nativity to Theophany Eve
  if ((weekday === 3 || weekday === 5) && !fastFree) return "fast";
  return "ordinary";
}

/** Each season's background (the same values as in app/globals.css), for the browser's bar color. */
export const SEASON_COLORS: Record<Season, string> = {
  sunday: "#614810",
  ordinary: "#173a28",
  feast: "#1c4a31",
  fast: "#5e2213",
  lent: "#4d1219",
  theotokos: "#15264a",
};

/**
 * Sets today's season on <html> (and the browser bar color) before the page
 * is drawn, and again whenever the app comes back, so it turns over at
 * midnight. If React redraws <html> (it does after a page renders differently
 * on the phone than on the server) and drops the attribute, it's put back.
 */
export const seasonHeadScript = `(function(){var s=${liturgicalSeason.toString()},c=${JSON.stringify(SEASON_COLORS)};function apply(){try{var k=s(new Date()),r=document.documentElement;r.dataset.season=k;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=c[k]}catch(e){}}apply();new MutationObserver(function(){if(!document.documentElement.dataset.season)apply()}).observe(document.documentElement,{attributes:true,attributeFilter:["data-season"]});document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")apply()})})();`;
