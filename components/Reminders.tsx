"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useEffect, useState } from "react";

// Daily reminders, only in the iPhone app. They're scheduled on the phone
// itself, so they work without a server and the athlete controls them here.
type Reminder = { id: number; label: string; body: string; on: boolean; time: string };

const KEY = "askesis:reminders";
const DEFAULTS: Reminder[] = [
  {
    id: 1,
    label: "Morning: log your sleep",
    body: "How did you sleep? Log it in your habit tracker.",
    on: false,
    time: "08:00",
  },
  {
    id: 2,
    label: "Evening: check off your habits",
    body: "Check off today's habits before bed.",
    on: false,
    time: "20:00",
  },
];

function load(): Reminder[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Pick<Reminder, "id" | "on" | "time">[] | null;
    if (!saved) return DEFAULTS;
    return DEFAULTS.map((d) => ({ ...d, ...saved.find((s) => s.id === d.id) }));
  } catch {
    return DEFAULTS;
  }
}

async function apply(r: Reminder) {
  await LocalNotifications.cancel({ notifications: [{ id: r.id }] });
  if (!r.on) return;
  const [hour, minute] = r.time.split(":").map(Number);
  await LocalNotifications.schedule({
    notifications: [
      { id: r.id, title: "Askesis", body: r.body, schedule: { on: { hour, minute }, allowWhileIdle: true } },
    ],
  });
}

export function Reminders() {
  const [native, setNative] = useState(false);
  const [items, setItems] = useState<Reminder[]>(DEFAULTS);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setNative(true);
    setItems(load());
  }, []);

  if (!native) return null;

  async function update(id: number, patch: Partial<Reminder>) {
    setNote(null);
    const next = items.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const changed = next.find((r) => r.id === id)!;
    if (changed.on) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") {
        setNote("Turn on notifications for Askesis in your iPhone Settings to get reminders.");
        return;
      }
    }
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.map(({ id, on, time }) => ({ id, on, time }))));
    } catch {
      // Storage blocked: reminders still scheduled for now.
    }
    await apply(changed).catch(() => setNote("Couldn't set that reminder. Try again."));
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-line pb-2 text-xs tracking-[0.2em] text-mute uppercase">Reminders</h2>
      <ul>
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-3 border-b border-line/60 py-3">
            <span className="flex-1 text-sm text-paper/80">{r.label}</span>
            <input
              type="time"
              value={r.time}
              onChange={(e) => e.target.value && update(r.id, { time: e.target.value })}
              aria-label={`${r.label} time`}
              className="bg-transparent text-sm text-paper tabular-nums [color-scheme:dark]"
            />
            <button
              type="button"
              role="switch"
              aria-checked={r.on}
              aria-label={r.label}
              onClick={() => update(r.id, { on: !r.on })}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                r.on ? "border-paper bg-paper" : "border-paper/40"
              }`}
            >
              <span
                className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
                  r.on ? "left-6 bg-ink" : "left-1 bg-paper/60"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-mute">{note}</p>}
    </section>
  );
}
