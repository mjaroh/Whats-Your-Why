import { test } from "node:test";
import assert from "node:assert/strict";
import { liturgicalSeason } from "../lib/liturgical.ts";

const on = (iso: string) => liturgicalSeason(new Date(`${iso}T12:00:00`));

test("weekdays: Sunday gold, Wednesday and Friday burnt red, the rest green", () => {
  assert.equal(on("2026-10-25"), "sunday");
  assert.equal(on("2026-10-26"), "ordinary"); // Monday
  assert.equal(on("2026-10-28"), "fast"); // Wednesday
  assert.equal(on("2026-10-30"), "fast"); // Friday
  assert.equal(on("2026-10-31"), "ordinary"); // Saturday
});

test("Orthodox Pascha and the feasts that move with it", () => {
  assert.equal(on("2026-04-12"), "feast"); // Pascha 2026
  assert.equal(on("2027-05-02"), "feast"); // Pascha 2027
  assert.equal(on("2026-04-05"), "feast"); // Palm Sunday
  assert.equal(on("2026-05-21"), "feast"); // Ascension
  assert.equal(on("2026-05-31"), "feast"); // Pentecost
});

test("Great Lent is red, Sundays included", () => {
  assert.equal(on("2026-02-23"), "lent"); // Clean Monday 2026
  assert.equal(on("2026-03-08"), "lent"); // a Sunday of Lent
  assert.equal(on("2026-04-11"), "lent"); // Holy Saturday
  assert.equal(on("2026-03-25"), "feast"); // Annunciation
});

test("Nativity and Dormition fasts are blue; their feasts green", () => {
  assert.equal(on("2026-11-15"), "theotokos");
  assert.equal(on("2026-12-24"), "theotokos");
  assert.equal(on("2026-11-21"), "feast"); // Entrance of the Theotokos
  assert.equal(on("2026-12-25"), "feast"); // Nativity
  assert.equal(on("2026-08-05"), "theotokos");
  assert.equal(on("2026-08-06"), "feast"); // Transfiguration
});

test("Apostles' Fast is green, Sundays included", () => {
  assert.equal(on("2026-06-08"), "ordinary"); // first day (All Saints was June 7)
  assert.equal(on("2026-06-14"), "ordinary"); // a Sunday in the fast
  assert.equal(on("2026-06-17"), "ordinary"); // a Wednesday in the fast
});

test("no burnt red in fast-free weeks", () => {
  assert.equal(on("2026-04-15"), "ordinary"); // Bright Wednesday
  assert.equal(on("2026-06-03"), "ordinary"); // Wednesday after Pentecost
  assert.equal(on("2026-12-30"), "ordinary"); // Wednesday after Nativity
  assert.equal(on("2027-01-05"), "fast"); // Theophany Eve
});

test("the head script is self-contained", () => {
  assert.doesNotThrow(() => new Function(`return (${liturgicalSeason.toString()})(new Date())`)());
});
