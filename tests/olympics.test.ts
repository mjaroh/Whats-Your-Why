import { test } from "node:test";
import assert from "node:assert/strict";
import { isSummerOlympicSport, LA28_START, untilLA28 } from "../lib/olympics.ts";

test("summer Olympic sports get the countdown", () => {
  for (const s of [
    "Gymnastics",
    "Track & Field",
    "Swimming",
    "Basketball",
    "Soccer",
    "Lacrosse",
    "Golf",
    "Rowing",
    "flag football",
    "Field hockey",
  ]) {
    assert.ok(isSummerOlympicSport(s), s);
  }
  for (const s of [
    "Hockey",
    "Cheer",
    "Dance",
    "Calisthenics",
    "Bodybuilder",
    "Lifter",
    "Football",
    "Cross Country",
    null,
  ]) {
    assert.ok(!isSummerOlympicSport(s), String(s));
  }
});

test("the countdown hits zero at midnight July 14, 2028 in Los Angeles", () => {
  assert.equal(
    new Date(LA28_START).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
    "7/14/2028, 12:00:00 AM",
  );
  assert.deepEqual(untilLA28(LA28_START - 90_061_000), { done: false, days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.equal(untilLA28(LA28_START).done, true);
  assert.equal(untilLA28(LA28_START + 5000).days, 0);
});
