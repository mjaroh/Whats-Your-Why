import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanBigDayTitle, describeBigDay, isCalendarDate } from "../lib/bigDay.ts";
import { countdown } from "../lib/countdown.ts";

test("big day titles and dates are checked", () => {
  assert.equal(cleanBigDayTitle("  State   meet "), "State meet");
  assert.equal(cleanBigDayTitle("x".repeat(80))?.length, 40);
  assert.equal(cleanBigDayTitle("  "), null);
  assert.ok(isCalendarDate("2027-03-14"));
  assert.ok(!isCalendarDate("2027-02-30"));
  assert.ok(!isCalendarDate("March 14"));
});

test("the coach hears how far away the big day is", () => {
  assert.equal(
    describeBigDay("State meet", "2026-11-14", "2026-10-17"),
    'Their big day: "State meet" on Sat, Nov 14, 2026 (28 days away).',
  );
  assert.match(describeBigDay("Tryouts", "2026-10-17", "2026-10-17"), /it's today/);
  assert.match(describeBigDay("Tryouts", "2026-10-15", "2026-10-17"), /2 days ago/);
});

test("countdown math", () => {
  assert.deepEqual(countdown(90_061_000, 0), { done: false, days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.equal(countdown(1000, 5000).done, true);
});
