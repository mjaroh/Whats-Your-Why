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

test("every habit plus 9½–10 hours of sleep earns a token", () => {
  assert.equal(earnsToken(habits, all, 9.5), true);
  assert.equal(earnsToken(habits, all, 10), true);
});

test("sleep outside 9½–10 hours doesn't", () => {
  assert.equal(earnsToken(habits, all, 9), false);
  assert.equal(earnsToken(habits, all, 10.5), false);
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
