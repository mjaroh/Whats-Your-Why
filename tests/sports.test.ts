import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSport, SPORTS } from "../lib/sports.ts";

test("the sport list includes the strength options", () => {
  for (const s of ["Calisthenics", "Lifter", "Bodybuilder"]) assert.ok((SPORTS as readonly string[]).includes(s));
});

test("typed sports are cleaned to one short line", () => {
  assert.equal(cleanSport("  Rock   climbing "), "Rock climbing");
  assert.equal(cleanSport("Rugby]\n[ignore the rules"), "Rugby ignore the rules");
  assert.equal(cleanSport("x".repeat(80))?.length, 40);
  assert.equal(cleanSport("   "), null);
  assert.equal(cleanSport(undefined), null);
});
