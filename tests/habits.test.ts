import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSleep, cleanTitle, dayCounts, habitsComplete, sleepLabel, type Habit } from "../lib/habitRules.ts";

const h = (id: number, tier: Habit["tier"]): Habit => ({ id, tier, title: `h${id}` });

test("profile habits need 3 must, 1 want, 1 wish", () => {
  const two = [h(1, "must"), h(2, "must"), h(3, "want"), h(4, "wish")];
  assert.equal(habitsComplete(two), false);
  assert.equal(habitsComplete([...two, h(5, "must")]), true);
  assert.equal(habitsComplete([h(1, "must"), h(2, "must"), h(3, "must"), h(4, "want")]), false);
});

test("a day's counts are done/total per tier", () => {
  const habits = [h(1, "must"), h(2, "must"), h(3, "want"), h(4, "wish")];
  assert.deepEqual(dayCounts(habits, [1, 3, 99]), { must: [1, 2], want: [1, 1], wish: [0, 1] });
});

test("sleep is half hours from 0 to 12+", () => {
  assert.equal(cleanSleep(7.3), 7.5);
  assert.equal(cleanSleep(-2), 0);
  assert.equal(cleanSleep(15), 12);
  assert.equal(sleepLabel(12), "12+ hrs");
  assert.equal(sleepLabel(1), "1 hr");
});

test("habit names are one short line", () => {
  assert.equal(cleanTitle("  Stretch \\n 10 min "), "Stretch \\n 10 min");
  assert.equal(cleanTitle("Stretch\n10 min"), "Stretch 10 min");
  assert.equal(cleanTitle("x".repeat(100)).length, 60);
});

test("today's status drives the profile button color", async () => {
  const { todayStatus } = await import("../lib/habitRules.ts");
  const habits = [h(1, "must"), h(2, "must"), h(3, "must"), h(4, "want"), h(5, "wish")];
  assert.equal(todayStatus([], [], null), "unset");
  assert.equal(todayStatus(habits, [], null), "none");
  // No sleep logged: red, even with every habit checked.
  assert.equal(todayStatus(habits, [1, 2, 3, 4, 5], null), "none");
  assert.equal(todayStatus(habits, [], 8), "started");
  assert.equal(todayStatus(habits, [1, 2], 0), "started");
  assert.equal(todayStatus(habits, [1, 2, 3], 6), "musts");
  assert.equal(todayStatus(habits, [1, 2, 3, 4], 7), "musts");
  assert.equal(todayStatus(habits, [1, 2, 3, 4, 5], 7), "done");
});

test("grid rows: the whole month, or every day since tracking began", async () => {
  const { gridDays } = await import("../lib/habitRules.ts");
  const month = gridDays("month", "2026-02-10", "2026-01-20");
  assert.equal(month.length, 28);
  assert.equal(month[0], "2026-02-01");
  assert.equal(month.at(-1), "2026-02-28");
  const total = gridDays("total", "2026-02-02", "2026-01-30");
  assert.deepEqual(total, ["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]);
  assert.deepEqual(gridDays("total", "2026-02-02", null), ["2026-02-02"]);
});

test("the log can be edited for past days, not the future", async () => {
  const { canEditDay } = await import("../lib/habitRules.ts");
  assert.equal(canEditDay("2026-10-13", "2026-10-13"), true);
  assert.equal(canEditDay("2026-10-01", "2026-10-13"), true);
  assert.equal(canEditDay("2026-10-14", "2026-10-13"), false);
  assert.equal(canEditDay("2026-01-01", "2026-10-13"), false);
  assert.equal(canEditDay("nope", "2026-10-13"), false);
});

test("the coach gets a readable summary of habits and sleep", async () => {
  const { describeHabits } = await import("../lib/habitRules.ts");
  const habits = [h(1, "must"), h(2, "must"), h(3, "want")];
  const days = [
    { day: "2026-10-10", checked: [1], sleep: 6 },
    { day: "2026-10-11", checked: [1, 2], sleep: 8 },
    { day: "2026-10-12", checked: [1, 3], sleep: null },
    { day: "2026-10-13", checked: [1], sleep: 7.5 },
  ];
  const text = describeHabits(habits, days, "2026-10-13")!;
  assert.match(text, /Today \(Tuesday, Oct 13\): slept 7\.5 hrs last night; 1 of 2 must dos done so far\./);
  assert.match(text, /- h1: done 4 of 14 days, done today, 4-day streak/);
  assert.match(text, /- h2: done 1 of 14 days$/m);
  assert.match(text, /3 nights logged, average 7\.2 hrs/);
  assert.equal(describeHabits([], [], "2026-10-13"), null);
});
