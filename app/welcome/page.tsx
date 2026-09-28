"use client";

import { useEffect, useState } from "react";
import { AGE_CONFIRMED_KEY, PENDING_WHY_KEY } from "@/components/JoinMembership";

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

// After sign-up: confirm 13+, pick a group username, and carry over the why
// the athlete found before creating their account.
export default function Welcome() {
  const [age13, setAge13] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already ticked on the join screen before sign-up.
  useEffect(() => {
    if (read(AGE_CONFIRMED_KEY) === "1") setAge13(true);
  }, []);

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let why = null;
    try {
      why = JSON.parse(read(PENDING_WHY_KEY) ?? "null");
    } catch {
      why = null;
    }
    const res = await fetch("/api/account/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ageConfirmed: true, username, why }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setError(data?.error ?? "Couldn't finish setting up. Try again.");
      setBusy(false);
      return;
    }
    try {
      sessionStorage.removeItem(PENDING_WHY_KEY);
      sessionStorage.removeItem(AGE_CONFIRMED_KEY);
    } catch {}
    window.location.replace("/community");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <form onSubmit={finish} className="rise w-full max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight">Pick your name for the group.</h1>
        <p className="mt-4 text-sm leading-relaxed text-mute">
          This is what other athletes see. Don&rsquo;t use your full name, school, city or birth year.
        </p>
        <label className="mt-8 block">
          <span className="text-xs tracking-[0.2em] text-mute uppercase">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            maxLength={20}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. beam_focus"
            className="mt-2 block w-full border-b border-line bg-transparent py-2 text-lg text-paper outline-none placeholder:text-paper/25 focus:border-paper"
          />
        </label>
        <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-paper/80">
          <input
            type="checkbox"
            checked={age13}
            onChange={(e) => setAge13(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-paper"
          />
          I&rsquo;m 13 or older.
        </label>
        {error && <p className="mt-6 text-sm text-mute">{error}</p>}
        <button
          type="submit"
          disabled={!age13 || username.length < 3 || busy}
          className="mt-8 w-full border border-paper/40 py-4 text-sm tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          {busy ? "Checking…" : "Join the group"}
        </button>
      </form>
    </main>
  );
}
