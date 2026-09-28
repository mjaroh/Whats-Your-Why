"use client";

import { useState } from "react";

export type WhyAnswers = { question: string; answer: string }[];

export const PENDING_WHY_KEY = "askesis:pendingWhy";
export const AGE_CONFIRMED_KEY = "askesis:age13";

function store(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode etc.: the welcome step will ask again.
  }
}

// Screen 4 once accounts are live: a free account joins the group; the
// private coach is $8/month inside the app. Athletes 13+.
export function JoinMembership(props: {
  statement: string;
  answers: WhyAnswers;
  signedIn: boolean;
}) {
  const [age13, setAge13] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);
  const why = { statement: props.statement, answers: props.answers };

  async function saveToCoach() {
    setStatus("busy");
    setError(null);
    try {
      const res = await fetch("/api/account/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(why),
      });
      if (!res.ok) throw new Error();
      window.location.href = "/community";
    } catch {
      setError("Couldn't save that. Try again.");
      setStatus("idle");
    }
  }

  function createAccount() {
    store(PENDING_WHY_KEY, JSON.stringify(why));
    store(AGE_CONFIRMED_KEY, "1");
    window.location.href = "/sign-up";
  }

  if (props.signedIn) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Take it to your coach.
        </h1>
        <p className="mt-6 leading-relaxed text-paper/70">
          This replaces the why saved to your account.
        </p>
        {error && <p className="mt-6 text-sm text-mute">{error}</p>}
        <button type="button" onClick={saveToCoach} disabled={status === "busy"} className={button}>
          {status === "busy" ? "Saving…" : "Save my new why"}
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Build on your why.
      </h1>
      <div className="mt-6 space-y-3 leading-relaxed text-paper/70">
        <p>
          Join the Askesis group, free: athletes who know their why, with a daily check-in from
          Michael&rsquo;s coach.
        </p>
        <p>
          Want more? Your own private coach that teaches in Michael&rsquo;s voice, built on your
          why, is $8 a month inside the app.
        </p>
      </div>

      <label className="mt-10 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-paper/80">
        <input
          type="checkbox"
          checked={age13}
          onChange={(e) => setAge13(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-paper"
        />
        I&rsquo;m 13 or older.
      </label>

      <button type="button" onClick={createAccount} disabled={!age13} className={button}>
        Join free
      </button>
      <p className="mt-4 text-xs leading-relaxed text-mute">
        Your why and your answers are saved to your account. Askesis is for athletes 13 and
        older.
      </p>
      <a href="/sign-in" className="mt-10 block text-sm text-paper/60 underline-offset-4 hover:underline">
        Already have an account? Sign in
      </a>
    </Shell>
  );
}

const button =
  "mt-8 w-full border border-paper/40 py-4 text-sm tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-40";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pt-28 pb-16">
      <div className="rise w-full max-w-md">{children}</div>
    </main>
  );
}
