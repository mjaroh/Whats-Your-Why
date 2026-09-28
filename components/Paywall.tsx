"use client";

import { useState } from "react";
import { AppNav } from "./AppNav";

export function Paywall(props: {
  statement: string | null;
  price: string;
  open: boolean;
  admin: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "Couldn't start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <AppNav active="coach" member={false} admin={props.admin} />
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
        <button
          type="button"
          onClick={start}
          disabled={busy || !props.open}
          className="mt-10 w-full border border-paper bg-paper py-4 text-sm tracking-[0.2em] text-ink uppercase transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          {!props.open ? "Opening soon" : busy ? "Opening checkout…" : `Start · ${props.price}`}
        </button>
        <p className="mt-4 text-xs text-mute">Cancel anytime.</p>
      </div>
    </main>
  );
}
