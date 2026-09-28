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

// After sign-up: record the 13+ confirmation and carry over the why the
// athlete found before creating their account.
export default function Welcome() {
  const [needsAge, setNeedsAge] = useState(false);
  const [age13, setAge13] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
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
      body: JSON.stringify({ ageConfirmed: true, why }),
    }).catch(() => null);
    if (!res?.ok) {
      setNeedsAge(true);
      setError("Couldn't finish setting up. Try again.");
      return;
    }
    try {
      sessionStorage.removeItem(PENDING_WHY_KEY);
      sessionStorage.removeItem(AGE_CONFIRMED_KEY);
    } catch {}
    window.location.replace("/coach");
  }

  useEffect(() => {
    if (read(AGE_CONFIRMED_KEY) === "1") void finish();
    else setNeedsAge(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!needsAge) {
    return <main className="flex min-h-dvh items-center justify-center text-mute">Setting up…</main>;
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="rise w-full max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight">One more thing.</h1>
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
          type="button"
          disabled={!age13}
          onClick={finish}
          className="mt-8 w-full border border-paper/40 py-4 text-sm tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          Continue
        </button>
        <p className="mt-4 text-xs leading-relaxed text-mute">
          Askesis membership is for athletes 13 and older.
        </p>
      </div>
    </main>
  );
}
