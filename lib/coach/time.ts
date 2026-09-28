/** The athlete's local calendar day, so check-ins roll over at their midnight. */
export function localDay(tz: string, now = new Date()): { date: string; weekday: string } {
  let zone = "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    zone = tz;
  } catch {
    // Unknown time zone: fall back to UTC.
  }
  return {
    date: now.toLocaleDateString("en-CA", { timeZone: zone }), // YYYY-MM-DD
    weekday: now.toLocaleDateString("en-US", { timeZone: zone, weekday: "long" }),
  };
}
