import { test } from "node:test";
import assert from "node:assert/strict";
import { localDay } from "../lib/coach/time.ts";

test("local day follows the athlete's time zone", () => {
  const now = new Date("2026-09-28T03:30:00Z"); // late Sunday evening in LA
  assert.deepEqual(localDay("America/Los_Angeles", now), { date: "2026-09-27", weekday: "Sunday" });
  assert.deepEqual(localDay("Europe/Berlin", now), { date: "2026-09-28", weekday: "Monday" });
});

test("unknown time zones fall back to UTC", () => {
  const now = new Date("2026-09-28T03:30:00Z");
  assert.equal(localDay("Not/AZone", now).date, "2026-09-28");
});

import { toApiMessages } from "../lib/coach/history.ts";

test("history becomes alternating turns starting with the athlete", () => {
  const out = toApiMessages(
    [
      { role: "assistant", content: "How was practice?", kind: "checkin" },
      { role: "user", content: "Rough.", kind: "chat" },
      { role: "assistant", content: "What happened?", kind: "chat" },
      { role: "assistant", content: "One word for today?", kind: "checkin" },
    ],
    "Tired",
  );
  assert.deepEqual(
    out.map((m) => m.role),
    ["user", "assistant", "user", "assistant", "user"],
  );
  assert.equal(out[1].content, "[Daily check-in] How was practice?");
  assert.equal(out[3].content, "What happened?\n\n[Daily check-in] One word for today?");
  assert.equal(out[4].content, "Tired");
});

test("a first message from the athlete needs no kickoff turn", () => {
  const out = toApiMessages([], "Hey coach");
  assert.deepEqual(out, [{ role: "user", content: "Hey coach" }]);
});
