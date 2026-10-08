"use client";

import { useEffect, useState } from "react";
import { untilLA28 } from "@/lib/olympics";

// Counts down to the LA 2028 Summer Olympics, live to the second.
export function LA28Countdown({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = untilLA28(now ?? 0);
  const units = [
    { value: left.days, label: "Days" },
    { value: left.hours, label: "Hrs" },
    { value: left.minutes, label: "Min" },
    { value: left.seconds, label: "Sec" },
  ];

  return (
    <section
      className={`w-full border border-line px-5 py-5 text-center ${className}`}
      aria-label="Countdown to LA 2028"
    >
      <h2 className="font-display text-sm font-bold tracking-[0.3em] uppercase">LA 2028</h2>
      {now === null ? (
        <div className="h-[3.75rem]" />
      ) : left.done ? (
        <p className="font-display mt-3 text-2xl font-bold tracking-tight">The Games are here.</p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2" role="timer" aria-live="off">
          {units.map((u) => (
            <div key={u.label}>
              <p className="font-display text-3xl font-bold tabular-nums">
                {u.label === "Days" ? u.value : String(u.value).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] tracking-[0.2em] text-mute uppercase">{u.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
