"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { AppNav, type NavMe } from "./AppNav";
import { AppShell } from "./AppShell";

// A taste of the coach, shown greyed out behind the lock.
const PREVIEW: { coach: boolean; checkin?: boolean; text: string }[] = [
  { coach: true, checkin: true, text: "How ya feelin' today? What's one thing you want to get out of practice?" },
  { coach: false, text: "Nervous for my meet Saturday. I keep thinking about falling." },
  {
    coach: true,
    text: "That's normal, I still feel it. Be in the moment you're in now. Tonight, relax and visualize your routines. When the moment comes, you'll be ready.",
  },
];

/** The coach screen for athletes who aren't members: greyed out, with a lock and the plans. */
export function Paywall(props: { nav: NavMe; statement: string | null; open: boolean; admin: boolean }) {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "Couldn't start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setBusy(null);
    }
  }

  return (
    <AppShell
      swipe="coach"
      header={<AppNav active="coach" me={props.nav} />}
      footer={
        <div aria-hidden className="bg-[#7a7a7a]/35 backdrop-grayscale">
          <div className="mx-auto w-full max-w-2xl shrink-0 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] opacity-40">
            <div className="border-t border-line pt-4 text-lg text-paper/25">Talk to your coach</div>
          </div>
        </div>
      }
    >
      <div className="relative h-full overflow-hidden">
        {/* What the coach looks like, greyed out behind the lock. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-2xl flex-col justify-end gap-7 px-6 pt-6 pb-8 opacity-50 grayscale select-none"
        >
          {props.statement && (
            <p className="font-display border-b border-line pb-8 text-lg leading-snug font-bold tracking-tight text-paper/50">
              &ldquo;{props.statement}&rdquo;
            </p>
          )}
          {PREVIEW.map((m, i) =>
            m.coach ? (
              <div key={i}>
                {m.checkin && (
                  <p className="mb-2 text-xs tracking-[0.2em] text-mute uppercase">Today&rsquo;s check-in</p>
                )}
                <p className="text-lg leading-relaxed text-paper">{m.text}</p>
              </div>
            ) : (
              <p key={i} className="border-l border-line pl-4 text-base leading-relaxed text-paper/60">
                {m.text}
              </p>
            ),
          )}
        </div>

        {/* The grey overtone and the lock. */}
        <div className="absolute inset-0 bg-[#7a7a7a]/35 backdrop-grayscale" />
        <div className="absolute inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-6 py-10">
            <div className="rise w-full max-w-sm border border-paper/30 bg-night/60 px-6 py-8 text-center backdrop-blur-[2px]">
              <LockIcon />
              <h1 className="font-display mt-5 text-2xl leading-tight font-bold tracking-tight">
                Subscribe to your personal coach
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-paper/70">
                A private coach in Michael&rsquo;s voice, built on your why. Talk anytime, get your own daily check-in
                and feedback on your videos.
              </p>
              {error && <p className="mt-5 text-sm text-mute">{error}</p>}
              <div className="mt-7 space-y-3">
                {(["year", "month"] as const).map((id) => {
                  const plan = PLANS[id];
                  const main = id === "year";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => start(id)}
                      disabled={Boolean(busy) || !props.open}
                      className={`flex w-full items-center justify-between border px-5 py-4 text-sm tracking-[0.15em] uppercase transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40 ${
                        main ? "border-paper bg-paper text-night" : "border-paper/40 text-paper"
                      }`}
                    >
                      <span>{!props.open ? "Opening soon" : busy === id ? "Opening checkout…" : plan.label}</span>
                      {plan.note && props.open && busy !== id && (
                        <span className="text-[10px] tracking-[0.2em]">{plan.note}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mute">
                Renews automatically. Cancel anytime from your profile. See the{" "}
                <a href="/terms" className="underline underline-offset-2">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline underline-offset-2">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function LockIcon() {
  return (
    <svg width="36" height="40" viewBox="0 0 36 40" fill="none" aria-hidden className="mx-auto text-paper">
      <rect x="3" y="17" width="30" height="21" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M10 17v-6a8 8 0 0 1 16 0v6" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="26" r="2.5" fill="currentColor" />
      <path d="M18 28v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
