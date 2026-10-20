"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { AppNav, type NavMe } from "./AppNav";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <AppNav active="coach" me={props.nav} />
      <div className="rise mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-10 pb-16">
        {props.statement && (
          <p className="font-display mb-12 text-2xl leading-snug font-bold tracking-tight">
            &ldquo;{props.statement}&rdquo;
          </p>
        )}
        <h1 className="text-xs tracking-[0.2em] text-mute uppercase">Your own coach</h1>
        <ul className="mt-5 space-y-3 leading-relaxed text-paper/80">
          <li>A private coach that teaches in Michael&rsquo;s voice, built on your why.</li>
          <li>Talk to it anytime: before a meet, after a rough practice.</li>
          <li>Your own daily check-in, on top of the group&rsquo;s.</li>
        </ul>
        {error && <p className="mt-6 text-sm text-mute">{error}</p>}
        <div className="mt-10 space-y-3">
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
                  main ? "border-paper bg-paper text-ink" : "border-paper/40 text-paper"
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
    </main>
  );
}
