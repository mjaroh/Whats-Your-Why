import { test } from "node:test";
import assert from "node:assert/strict";
import { earnsToken, TOKEN_MESSAGES } from "../lib/tokenRules.ts";
import type { Habit } from "../lib/habitRules.ts";

const habits: Habit[] = [
  { id: 1, tier: "must", title: "a" },
  { id: 2, tier: "must", title: "b" },
  { id: 3, tier: "must", title: "c" },
  { id: 4, tier: "want", title: "d" },
  { id: 5, tier: "wish", title: "e" },
];
const all = [1, 2, 3, 4, 5];

test("all musts, one want, one wish plus at least 9½ hours of sleep earns a token", () => {
  const more: Habit[] = [...habits, { id: 6, tier: "want", title: "f" }, { id: 7, tier: "wish", title: "g" }];
  assert.equal(earnsToken(more, [1, 2, 3, 6, 5], 9.5), true);
  assert.equal(earnsToken(more, [1, 2, 3, 4, 6], 10), false); // no wish
  assert.equal(earnsToken(more, [1, 2, 4, 5], 10), false); // a must missed
});

test("every habit plus at least 9½ hours of sleep earns a token", () => {
  assert.equal(earnsToken(habits, all, 9.5), true);
  assert.equal(earnsToken(habits, all, 10), true);
});

test("9½ hours or more counts, with no upper limit", () => {
  assert.equal(earnsToken(habits, all, 10.5), true);
  assert.equal(earnsToken(habits, all, 12), true);
});

test("under 9½ hours doesn't", () => {
  assert.equal(earnsToken(habits, all, 9), false);
  assert.equal(earnsToken(habits, all, null), false);
});

test("a missed habit or an unfinished tracker doesn't", () => {
  assert.equal(earnsToken(habits, [1, 2, 3, 4], 10), false);
  assert.equal(earnsToken(habits.slice(0, 2), [1, 2], 10), false);
  assert.equal(earnsToken([], [], 10), false);
});

test("the first token quotes 1 Corinthians 9:24 and links Fr. Steven Kostoff", () => {
  assert.match(TOKEN_MESSAGES[1].source, /1 Corinthians 9:24/);
  assert.equal(TOKEN_MESSAGES[1].link?.label, "Steven Kostoff");
});

test("the second token quotes 2 Timothy 1:7", () => {
  assert.match(TOKEN_MESSAGES[2].source, /2 Timothy 1:7/);
  assert.match(TOKEN_MESSAGES[2].quote, /^For God has not given us a spirit of fear/);
  assert.equal(TOKEN_MESSAGES[2].link?.label, "St. John Chrysostom");
});
