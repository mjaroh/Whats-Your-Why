"use client";

import { useState } from "react";

export function Continue() {
  const [parentEmail, setParentEmail] = useState("");
  const [athleteFirstName, setAthleteFirstName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail, athleteFirstName, website }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="rise font-display text-3xl font-bold tracking-tight sm:text-4xl">
          You&rsquo;re on the list.
        </h1>
        <p className="rise mt-5 max-w-sm text-paper/60" style={{ animationDelay: "0.2s" }}>
          We&rsquo;ll email {parentEmail} when Askesis membership opens for {athleteFirstName}.
        </p>
      </main>
    );
  }

  const field =
    "mt-2 block w-full border-b border-line bg-transparent py-2 text-lg text-paper outline-none transition-colors placeholder:text-paper/25 focus:border-paper";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="rise w-full max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Build on your why.
        </h1>
        <div className="mt-6 space-y-3 leading-relaxed text-paper/70">
          <p>
            Askesis membership gives your athlete an AI coach that teaches in Michael&rsquo;s
            voice, built around the purpose they just found.
          </p>
          <p>Plus a moderated community of athletes doing the same work.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-12 space-y-8" noValidate>
          <label className="block">
            <span className="text-xs tracking-[0.2em] text-mute uppercase">
              Parent / guardian email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-xs tracking-[0.2em] text-mute uppercase">
              Athlete&rsquo;s first name
            </span>
            <input
              type="text"
              required
              maxLength={40}
              autoComplete="off"
              value={athleteFirstName}
              onChange={(e) => setAthleteFirstName(e.target.value)}
              placeholder="First name only"
              className={field}
            />
          </label>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          />

          {error && <p className="text-sm text-mute">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending" || !parentEmail || !athleteFirstName}
            className="w-full border border-paper/40 py-4 text-sm tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            {status === "sending" ? "Saving…" : "Join the waitlist"}
          </button>
          <p className="text-xs leading-relaxed text-mute">
            No payment now. This is a waitlist. We only use this email to tell you when
            membership opens.
          </p>
        </form>
      </div>
    </main>
  );
}
