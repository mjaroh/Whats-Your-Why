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
  assert.equal(todayStatus(habits, [], 8), "started");
  assert.equal(todayStatus(habits, [1, 2], null), "started");
  assert.equal(todayStatus(habits, [1, 2, 3], null), "musts");
  assert.equal(todayStatus(habits, [1, 2, 3, 4, 5], null), "musts");
  assert.equal(todayStatus(habits, [1, 2, 3, 4], 7), "musts");
  assert.equal(todayStatus(habits, [1, 2, 3, 4, 5], 7), "done");
});
