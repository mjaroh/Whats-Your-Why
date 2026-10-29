import { test } from "node:test";
import assert from "node:assert/strict";
import { fixOpeningDay, openingWeekday, opensWithWrongDay } from "../lib/coach/weekday.ts";

test("finds a weekday the check-in opens with", () => {
  assert.equal(openingWeekday("Saturday, good day to notice the small stuff."), "Saturday");
  assert.equal(openingWeekday("Sunday's a good day to rest on purpose."), "Sunday");
  assert.equal(openingWeekday("It's Friday. What went well?"), "Friday");
  assert.equal(openingWeekday("Happy Monday! What's one goal?"), "Monday");
  assert.equal(openingWeekday("How did practice go? Your meet is Saturday."), null);
});

test("only a wrong opening day counts", () => {
  assert.equal(opensWithWrongDay("Saturday, good day to notice the small stuff.", "Thursday"), true);
  assert.equal(opensWithWrongDay("Thursday, good day to notice the small stuff.", "Thursday"), false);
  assert.equal(opensWithWrongDay("What's one thing before your meet Saturday?", "Thursday"), false);
});

test("puts today's name in place of a wrong opening day", () => {
  assert.equal(
    fixOpeningDay("Saturday, good day to notice the small stuff.", "Thursday"),
    "Thursday, good day to notice the small stuff.",
  );
  assert.equal(fixOpeningDay("Sunday's a good day to rest.", "Wednesday"), "Wednesday's a good day to rest.");
});
