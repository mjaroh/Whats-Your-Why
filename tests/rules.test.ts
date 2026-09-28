import { test } from "node:test";
import assert from "node:assert/strict";
import { sharesContact, usernameProblem } from "../lib/rules.ts";

test("blocks contact details and off-app invites", () => {
  for (const text of [
    "text me 555-123-4567",
    "my email is jordan.k@gmail.com",
    "follow me @jordan_flips",
    "add my snap: jflips22",
    "insta jordan.gym",
    "check www.mysite.com",
    "dm me after practice",
    "https://example.com/video",
  ]) {
    assert.equal(sharesContact(text), true, text);
  }
});

test("allows normal group chat", () => {
  for (const text of [
    "Practice was brutal but I landed my full twist",
    "Meet is on the 12th, so nervous",
    "Scored a 9.2 on beam!",
    "Praying for everyone competing this weekend",
    "I did 3 sets of 10 today",
  ]) {
    assert.equal(sharesContact(text), false, text);
  }
});

test("username rules", () => {
  assert.equal(usernameProblem("beam_queen"), null);
  assert.equal(usernameProblem("Flip23"), null);
  assert.ok(usernameProblem("ab"));
  assert.ok(usernameProblem("has space"));
  assert.ok(usernameProblem("Askesis_Official"));
  assert.ok(usernameProblem("coach_mike"));
  assert.ok(usernameProblem("jordan2011"));
});
