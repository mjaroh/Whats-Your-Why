"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { Logo } from "./Logo";

export function Paywall(props: { statement: string | null; price: string; open: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signOut } = useClerk();

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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pt-28 pb-16">
      <Logo />
      <div className="rise w-full max-w-md">
        {props.statement && (
          <p className="font-display mb-12 text-2xl leading-snug font-bold tracking-tight">
            &ldquo;{props.statement}&rdquo;
          </p>
        )}
        <h1 className="text-xs tracking-[0.2em] text-mute uppercase">Askesis membership</h1>
        <ul className="mt-5 space-y-3 leading-relaxed text-paper/80">
          <li>A coach that teaches in Michael&rsquo;s voice, built on your why.</li>
          <li>Talk to it anytime: before a meet, after a rough practice.</li>
          <li>A short check-in every day.</li>
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
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/" })}
          className="mt-12 text-sm text-paper/50 underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
