"use client";

import { useEffect, useState } from "react";
import { bigDayStart } from "@/lib/bigDay";
import { countdown } from "@/lib/countdown";
import { LA28_START } from "@/lib/olympics";

/**
 * A live countdown card (days, hours, minutes, seconds). `after` is shown
 * once the moment arrives. With onClick, the whole card is a button.
 */
export function Countdown(props: {
  title: string;
  target: number;
  after: (now: number) => string;
  onClick?: () => void;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = countdown(props.target, now ?? 0);
  const units = [
    { value: left.days, label: "Days" },
    { value: left.hours, label: "Hrs" },
    { value: left.minutes, label: "Min" },
    { value: left.seconds, label: "Sec" },
  ];
  const body = (
    <>
      <h2 className="font-display text-sm font-bold tracking-[0.3em] uppercase">{props.title}</h2>
      {now === null ? (
        <div className="h-[3.75rem]" />
      ) : left.done ? (
        <p className="font-display mt-3 text-2xl font-bold tracking-tight">{props.after(now)}</p>
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
    </>
  );
  const box = `block w-full border border-line px-5 py-5 text-center ${props.className ?? ""}`;
  return props.onClick ? (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={`Countdown to ${props.title}. Tap to change it.`}
      className={`${box} transition-colors hover:border-paper/50`}
    >
      {body}
    </button>
  ) : (
    <section aria-label={`Countdown to ${props.title}`} className={box}>
      {body}
    </section>
  );
}

// Counts down to the LA 2028 Summer Olympics, live to the second.
export function LA28Countdown({ className = "" }: { className?: string }) {
  return <Countdown title="LA 2028" target={LA28_START} after={() => "The Games are here."} className={className} />;
}

/** The athlete's own big day, counting to midnight where they are. Tap to edit. */
export function BigDayCountdown(props: { title: string; date: string; onEdit: () => void; className?: string }) {
  const start = bigDayStart(props.date);
  return (
    <Countdown
      title={props.title}
      target={start}
      after={(now) => (now < start + 86_400_000 ? "Today's the day." : "Done. Tap to set your next big day.")}
      onClick={props.onEdit}
      className={props.className}
    />
  );
}
