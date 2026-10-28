import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKUP_QUESTIONS, backupQuestion } from "../lib/backupQuestions.ts";

test("a backup question changes day to day", () => {
  assert.notEqual(backupQuestion("2026-10-25", []), backupQuestion("2026-10-26", []));
});

test("a backup question skips the recent ones", () => {
  const today = backupQuestion("2026-10-25", []);
  const next = backupQuestion("2026-10-25", [today]);
  assert.notEqual(next, today);
  assert.ok(BACKUP_QUESTIONS.includes(next));
});

test("every backup question ends in exactly one question", () => {
  for (const q of BACKUP_QUESTIONS) assert.equal(q.split("?").length - 1, 1, q);
});
