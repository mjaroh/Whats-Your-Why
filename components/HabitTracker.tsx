"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HABIT_MAX_CHARS,
  habitsComplete,
  SLEEP_MAX,
  sleepLabel,
  TIER_LABEL,
  TIER_MAX,
  TIER_MIN,
  TIERS,
  type DayCounts,
  type Habit,
  type Tier,
} from "@/lib/habitRules";
import { AppNav, type NavMe } from "./AppNav";
import { AppShell } from "./AppShell";

type LogDay = { day: string; counts: DayCounts | null; checked: string[]; sleep: number | null };
type Data = {
  date: string;
  weekday: string;
  habits: Habit[];
  checked: number[];
  sleep: number | null;
  log: LogDay[];
};

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, tz: tz() }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; habit?: Habit };
  if (!res.ok) throw new Error(data.error ?? "That didn't save. Try again.");
  return data;
}

const shortDate = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", ...opts });

export function HabitTracker(props: { nav: NavMe }) {
  const [data, setData] = useState<Data | null>(null);
  const [layer, setLayer] = useState<"today" | "log">("today");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/habits?tz=${encodeURIComponent(tz())}`).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't load your habits. Pull down to try again.");
      return;
    }
    const next = (await res.json()) as Data;
    setData(next);
    setError(null);
    if (next.habits.length === 0) setEditing(true);
  }, []);

  // Load, reload when the app comes back, and roll over at local midnight.
  useEffect(() => {
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const t = setTimeout(() => void load(), midnight.getTime() - now.getTime());
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(t);
    };
  }, [load]);

  async function toggle(h: Habit) {
    if (!data) return;
    const done = !data.checked.includes(h.id);
    setData({ ...data, checked: done ? [...data.checked, h.id] : data.checked.filter((id) => id !== h.id) });
    try {
      await post({ action: "check", id: h.id, done });
    } catch (err) {
      setError((err as Error).message);
      void load();
    }
  }

  async function add(tier: Tier, title: string) {
    const { habit } = await post({ action: "add", tier, title });
    if (habit) setData((d) => (d ? { ...d, habits: [...d.habits, habit] } : d));
  }

  async function remove(h: Habit) {
    setData((d) => (d ? { ...d, habits: d.habits.filter((x) => x.id !== h.id) } : d));
    try {
      await post({ action: "remove", id: h.id });
    } catch (err) {
      setError((err as Error).message);
      void load();
    }
  }

  const complete = data ? habitsComplete(data.habits) : false;

  return (
    <AppShell header={<AppNav active="profile" me={props.nav} />}>
      <div className="mx-auto w-full max-w-2xl px-6 pt-6 pb-[max(4rem,calc(env(safe-area-inset-bottom)+2rem))]">
        <div className="flex items-center justify-between">
          <a href="/profile" className="text-xs tracking-[0.2em] text-mute uppercase hover:text-paper">
            ← Profile
          </a>
          <div className="flex border border-line" role="tablist" aria-label="Habit tracker">
            {(["today", "log"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={layer === l}
                onClick={() => setLayer(l)}
                className={`px-4 py-2 text-xs tracking-[0.2em] uppercase transition-colors ${
                  layer === l ? "bg-paper text-ink" : "text-paper/60 hover:text-paper"
                }`}
              >
                {l === "today" ? "Today" : "Log"}
              </button>
            ))}
          </div>
        </div>

        <h1 className="font-display mt-8 text-3xl font-bold tracking-tight">Habit tracker</h1>
        {error && <p className="mt-4 text-sm text-mute">{error}</p>}
        {!data ? (
          !error && <p className="mt-8 text-paper/50">Loading…</p>
        ) : layer === "today" ? (
          <Today
            data={data}
            complete={complete}
            editing={editing}
            setEditing={setEditing}
            onToggle={toggle}
            onAdd={add}
            onRemove={remove}
            onSleep={(hours) => {
              setData((d) => (d ? { ...d, sleep: hours } : d));
              post({ action: "sleep", hours }).catch((err) => setError((err as Error).message));
            }}
          />
        ) : (
          <Log data={data} />
        )}
      </div>
    </AppShell>
  );
}

/* ---------- Layer 1: today's checklist ---------- */

function Today(props: {
  data: Data;
  complete: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onToggle: (h: Habit) => void;
  onAdd: (tier: Tier, title: string) => Promise<void>;
  onRemove: (h: Habit) => void;
  onSleep: (hours: number) => void;
}) {
  const { data } = props;
  return (
    <>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <p className="text-paper/60">
          {data.weekday}, {shortDate(data.date, { month: "long", day: "numeric" })}
        </p>
        {data.habits.length > 0 && (
          <button
            type="button"
            onClick={() => props.setEditing(!props.editing)}
            className="text-xs tracking-[0.2em] text-paper/60 uppercase hover:text-paper"
          >
            {props.editing ? "Done" : "Edit habits"}
          </button>
        )}
      </div>

      {!props.complete && (
        <div className="mt-6 border border-line px-5 py-4 text-sm leading-relaxed text-paper/70">
          Choose your own habits: at least {TIER_MIN.must} must dos, {TIER_MIN.want} want to do and {TIER_MIN.wish} wish
          to do. That completes your profile.
        </div>
      )}

      <Sleep value={data.sleep} onChange={props.onSleep} />

      {TIERS.map((tier) => (
        <TierList
          key={tier}
          tier={tier}
          habits={data.habits.filter((h) => h.tier === tier)}
          checked={data.checked}
          editing={props.editing}
          onToggle={props.onToggle}
          onAdd={props.onAdd}
          onRemove={props.onRemove}
        />
      ))}

      <p className="mt-10 text-xs leading-relaxed text-mute">
        Your checklist starts fresh at midnight. Each day is saved to your log.
      </p>
    </>
  );
}

function TierList(props: {
  tier: Tier;
  habits: Habit[];
  checked: number[];
  editing: boolean;
  onToggle: (h: Habit) => void;
  onAdd: (tier: Tier, title: string) => Promise<void>;
  onRemove: (h: Habit) => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = props.habits.filter((h) => props.checked.includes(h.id)).length;
  const short = TIER_MIN[props.tier] - props.habits.length;
  const label = TIER_LABEL[props.tier].toLowerCase();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    setError(null);
    try {
      await props.onAdd(props.tier, title);
      setDraft("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">{TIER_LABEL[props.tier]}</h2>
        {props.habits.length > 0 && (
          <span className="text-xs tracking-[0.15em] text-paper/60 tabular-nums">
            {done}/{props.habits.length}
          </span>
        )}
      </div>
      <ul>
        {props.habits.map((h) => {
          const on = props.checked.includes(h.id);
          return (
            <li key={h.id} className="flex items-center gap-3 border-b border-line/60">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => props.onToggle(h)}
                disabled={props.editing}
                className="flex flex-1 items-center gap-4 py-4 text-left disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    on ? "border-paper bg-paper text-ink" : "border-paper/40"
                  }`}
                >
                  {on && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </span>
                <span className={`text-lg leading-snug ${on ? "text-paper/50 line-through" : "text-paper"}`}>
                  {h.title}
                </span>
              </button>
              {props.editing && (
                <button
                  type="button"
                  onClick={() => props.onRemove(h)}
                  aria-label={`Remove ${h.title}`}
                  className="px-2 text-xl leading-none text-paper/50 hover:text-paper"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {props.editing && props.habits.length < TIER_MAX && (
        <form onSubmit={add} className="mt-3 flex items-center gap-3 border-b border-line pb-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={HABIT_MAX_CHARS}
            placeholder={`Add a ${label}`}
            aria-label={`Add a ${label}`}
            enterKeyHint="done"
            className="flex-1 bg-transparent py-2 text-lg text-paper caret-paper outline-none placeholder:text-paper/25"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="text-xs tracking-[0.2em] text-paper uppercase disabled:opacity-30"
          >
            Add
          </button>
        </form>
      )}
      {short > 0 && (
        <p className="mt-2 text-xs text-mute">
          Add {short} more {short === 1 ? label : `${label}s`} to complete your profile.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-mute">{error}</p>}
    </section>
  );
}

/** Sleep sits first. Until it's logged it's loud: the profile button stays red too. */
function Sleep({ value, onChange }: { value: number | null; onChange: (hours: number) => void }) {
  const [local, setLocal] = useState<number | null>(value);
  const [picked, setPicked] = useState(8);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setLocal(value), [value]);

  function change(hours: number) {
    setLocal(hours);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(hours), 400);
  }

  const slider = (v: number, set: (h: number) => void, accent: string) => (
    <>
      <input
        type="range"
        min={0}
        max={SLEEP_MAX}
        step={0.5}
        value={v}
        onChange={(e) => set(Number(e.target.value))}
        aria-label="Hours of sleep last night"
        aria-valuetext={sleepLabel(v)}
        className={`mt-6 w-full ${accent}`}
      />
      <div className="mt-2 flex justify-between text-xs text-mute">
        <span>0</span>
        <span>6</span>
        <span>12+</span>
      </div>
    </>
  );

  if (local === null) {
    return (
      <section className="mt-8 border-2 border-status-red px-5 py-6" aria-label="Log your sleep">
        <p className="text-xs tracking-[0.2em] text-status-red uppercase">Sleep not logged</p>
        <h2 className="font-display mt-3 text-2xl leading-tight font-bold tracking-tight">
          How much did you sleep last night?
        </h2>
        <p className="font-display mt-6 text-center text-4xl font-bold tabular-nums">{sleepLabel(picked)}</p>
        {slider(picked, setPicked, "accent-status-red")}
        <button
          type="button"
          onClick={() => {
            setLocal(picked);
            onChange(picked);
          }}
          className="mt-6 w-full bg-status-red py-4 text-sm tracking-[0.2em] text-ink uppercase"
        >
          Log {sleepLabel(picked)}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Sleep last night</h2>
        <span className="text-sm text-paper tabular-nums">{sleepLabel(local)}</span>
      </div>
      {slider(local, change, "accent-paper")}
    </section>
  );
}

/* ---------- Layer 2: the log ---------- */

function Log({ data }: { data: Data }) {
  const [open, setOpen] = useState<string | null>(null);
  const todayCounts: DayCounts = Object.fromEntries(
    TIERS.map((t) => {
      const inTier = data.habits.filter((h) => h.tier === t);
      return [t, [inTier.filter((h) => data.checked.includes(h.id)).length, inTier.length]];
    }),
  ) as DayCounts;
  const days: LogDay[] = [
    {
      day: data.date,
      counts: todayCounts,
      checked: data.habits.filter((h) => data.checked.includes(h.id)).map((h) => h.title),
      sleep: data.sleep,
    },
    ...data.log,
  ];

  return (
    <>
      <SleepChart days={days.slice(0, 14).reverse()} today={data.date} />
      <section className="mt-12">
        <h2 className="border-b border-line pb-2 text-xs tracking-[0.2em] text-mute uppercase">Last 30 days</h2>
        <ul>
          {days.map((d) => {
            const logged = d.counts !== null || d.sleep !== null;
            const isOpen = open === d.day;
            return (
              <li key={d.day} className="border-b border-line/60">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : d.day)}
                  disabled={!logged || d.checked.length === 0}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
                >
                  <span className="w-24 shrink-0 text-sm text-paper/80">
                    {d.day === data.date
                      ? "Today"
                      : shortDate(d.day, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  {logged ? (
                    <span className="flex flex-1 flex-wrap gap-x-3 gap-y-1 text-xs tracking-[0.1em] text-paper/70 uppercase tabular-nums">
                      {d.counts &&
                        TIERS.filter((t) => d.counts![t][1] > 0).map((t) => (
                          <span key={t} className={d.counts![t][0] === d.counts![t][1] ? "text-paper" : ""}>
                            {t} {d.counts![t][0]}/{d.counts![t][1]}
                          </span>
                        ))}
                      {d.sleep !== null && <span className="text-mute">{sleepLabel(d.sleep)}</span>}
                    </span>
                  ) : (
                    <span className="flex-1 text-xs text-mute">Not logged</span>
                  )}
                </button>
                {isOpen && (
                  <ul className="pb-3 pl-27 text-sm text-paper/70">
                    {d.checked.map((t, i) => (
                      <li key={i}>✓ {t}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** Hours slept per day, last 14 days. One series, so the title names it. */
function SleepChart({ days, today }: { days: LogDay[]; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 340;
  const H = 170;
  const left = 26;
  const bottom = 22;
  const top = 8;
  const plotW = W - left;
  const plotH = H - bottom - top;
  const slot = plotW / days.length;
  const barW = Math.max(4, slot - 4);
  const y = (h: number) => top + plotH - (Math.min(h, SLEEP_MAX) / SLEEP_MAX) * plotH;
  const logged = days.filter((d) => d.sleep !== null);
  const avg = logged.length ? logged.reduce((s, d) => s + d.sleep!, 0) / logged.length : null;
  const shown = active !== null ? days[active] : null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Sleep · last 14 days</h2>
        <span className="text-sm text-paper/80 tabular-nums">
          {shown
            ? `${shortDate(shown.day, { weekday: "short", month: "short", day: "numeric" })} · ${
                shown.sleep === null ? "not logged" : sleepLabel(shown.sleep)
              }`
            : avg !== null
              ? `Avg ${sleepLabel(Math.round(avg * 2) / 2)}`
              : "Nothing logged yet"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Hours of sleep for the last 14 days${avg !== null ? `, averaging ${avg.toFixed(1)} hours` : ""}`}
        onMouseLeave={() => setActive(null)}
      >
        {[0, 4, 8, 12].map((h) => (
          <g key={h}>
            <line x1={left} x2={W} y1={y(h)} y2={y(h)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={left - 6} y={y(h) + 3} textAnchor="end" fontSize={9} fill="var(--color-mute)">
              {h === 12 ? "12+" : h}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = left + i * slot + (slot - barW) / 2;
          const isToday = d.day === today;
          return (
            <g key={d.day}>
              {d.sleep !== null && d.sleep > 0 ? (
                <path
                  d={roundedTop(x, y(d.sleep), barW, y(0) - y(d.sleep), Math.min(4, barW / 2))}
                  fill="var(--color-paper)"
                  opacity={active === null || active === i ? 0.9 : 0.35}
                />
              ) : (
                <circle
                  cx={x + barW / 2}
                  cy={y(0) - 3}
                  r={1.5}
                  fill={d.sleep === 0 ? "var(--color-paper)" : "var(--color-mute)"}
                />
              )}
              {(i % 2 === days.length % 2 || isToday) && (
                <text
                  x={isToday ? x + barW : x + barW / 2}
                  y={H - 6}
                  textAnchor={isToday ? "end" : "middle"}
                  fontSize={9}
                  fill={isToday ? "var(--color-paper)" : "var(--color-mute)"}
                >
                  {isToday ? "Today" : shortDate(d.day, { day: "numeric" })}
                </text>
              )}
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={left + i * slot}
                y={top}
                width={slot}
                height={plotH + bottom}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(active === i ? null : i)}
              />
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
