import { test } from "node:test";
import assert from "node:assert/strict";
import { keywordScreen } from "../lib/keywords.ts";

test("flags clear crisis language", () => {
  assert.equal(keywordScreen("sometimes I just want to die"), "suicide");
  assert.equal(keywordScreen("I've thought about killing myself"), "suicide");
  assert.equal(keywordScreen("I don’t want to be here anymore"), "suicide");
  assert.equal(keywordScreen("I cut myself after meets"), "self_harm");
  assert.equal(keywordScreen("my coach hits me when I fall"), "abuse");
  assert.equal(keywordScreen("I don't feel safe at home"), "danger");
});

test("ignores sports hyperbole and ordinary answers", () => {
  for (const text of [
    "I want to win state",
    "I want to kill it at nationals",
    "I'd die for this sport",
    "coach is killing us in practice",
    "to make my dad proud",
    "it hits me that I love this",
  ]) {
    assert.equal(keywordScreen(text), null, text);
  }
});

test("leaves faith language to the context-aware classifier", () => {
  for (const text of [
    "I want my career crucified",
    "I want to die to myself every day",
    "I'm going to die for Christ if I have to",
    "crucified with Christ",
    "lay down my life for God",
  ]) {
    assert.equal(keywordScreen(text), null, text);
  }
  // Plain statements still stop immediately.
  assert.equal(keywordScreen("I want to die"), "suicide");
  assert.equal(keywordScreen("I just want to die."), "suicide");
  assert.equal(keywordScreen("honestly I want to die for real"), "suicide");
});
