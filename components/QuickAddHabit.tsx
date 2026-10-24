"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { refreshWidgets } from "@/lib/client/widgets";
import { HABIT_MAX_CHARS, TIER_LABEL, TIER_MAX, TIERS, type Habit, type Tier } from "@/lib/habitRules";

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Add habits to any list without leaving the profile. Opens from a long
 * press on the Habit tracker button. `armed` is false while the finger that
 * held the button is still down, so its lift doesn't tap anything here.
 */
export function QuickAddHabit({ armed, onClose }: { armed: boolean; onClose: (changed: boolean) => void }) {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [tier, setTier] = useState<Tier>("must");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    fetch(`/api/habits?tz=${encodeURIComponent(tz())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { habits?: Habit[] } | null) => setHabits(d?.habits ?? []))
      .catch(() => setHabits([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(added > 0);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, added]);

  const inTier = (habits ?? []).filter((h) => h.tier === tier);
  const full = inTier.length >= TIER_MAX;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || busy || full) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", tier, title, tz: tz() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; habit?: Habit };
      if (!res.ok || !data.habit) throw new Error(data.error ?? "That didn't save. Try again.");
      setHabits((all) => [...(all ?? []), data.habit!]);
      refreshWidgets();
      setDraft("");
      setAdded((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-30 flex items-end bg-ink/70 ${armed ? "" : "pointer-events-none"}`}
      onClick={() => onClose(added > 0)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a habit"
        onClick={(e) => e.stopPropagation()}
        className="rise mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto border-t border-line bg-ink px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">ADD A HABIT</h2>

        <div className="mt-5 grid grid-cols-3 border border-line" role="tablist" aria-label="Which list">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tier === t}
              onClick={() => {
                setTier(t);
                setError(null);
              }}
              className={`px-2 py-3 text-[11px] tracking-[0.15em] uppercase transition-colors ${
                tier === t ? "bg-paper text-ink" : "text-paper/60 hover:text-paper"
              }`}
            >
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>

        {habits === null ? (
          <p className="mt-6 text-sm text-paper/50">Loading…</p>
        ) : (
          <>
            <ul className="mt-4">
              {inTier.length === 0 ? (
                <li className="py-3 text-sm text-paper/50">Nothing on this list yet.</li>
              ) : (
                inTier.map((h) => (
                  <li key={h.id} className="border-b border-line/60 py-3 text-paper/80">
                    {h.title}
                  </li>
                ))
              )}
            </ul>
            {full ? (
              <p className="mt-4 text-sm text-mute">
                That&rsquo;s the most for this list. Remove one in the habit tracker first.
              </p>
            ) : (
              <form onSubmit={add} className="mt-4 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={HABIT_MAX_CHARS}
                  placeholder={`New ${TIER_LABEL[tier].toLowerCase()} habit`}
                  aria-label={`New ${TIER_LABEL[tier].toLowerCase()} habit`}
                  className="min-w-0 flex-1 border border-line bg-transparent px-4 py-3 text-base text-paper placeholder:text-paper/35 focus:border-paper/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || busy}
                  className="bg-paper px-5 text-xs tracking-[0.2em] text-ink uppercase disabled:opacity-40"
                >
                  {busy ? "…" : "Add"}
                </button>
              </form>
            )}
            {error && <p className="mt-3 text-sm text-mute">{error}</p>}
          </>
        )}

        <button
          type="button"
          onClick={() => onClose(added > 0)}
          className="mt-6 w-full py-3 text-xs tracking-[0.2em] text-paper/60 uppercase"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
