// Shared by the LA 2028 and big-day countdowns.

/** Days, hours, minutes and seconds until `target` (all zero once it's reached). */
export function countdown(target: number, now: number) {
  const left = Math.max(0, Math.floor((target - now) / 1000));
  return {
    done: left === 0,
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3_600),
    minutes: Math.floor((left % 3_600) / 60),
    seconds: left % 60,
  };
}
