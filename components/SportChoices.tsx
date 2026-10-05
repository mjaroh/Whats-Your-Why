"use client";

import { useState } from "react";
import { SPORT_MAX_CHARS, SPORTS } from "@/lib/sports";

const chip = "border px-4 py-2.5 text-xs tracking-[0.15em] uppercase transition-colors hover:border-paper";
const off = "border-paper/30 hover:bg-paper hover:text-ink";
const on = "border-paper bg-paper text-ink";

/** Sport buttons plus "Other" with a box to type their own. */
export function SportChoices(props: { onPick: (sport: string) => void; current?: string | null; className?: string }) {
  const listed = (SPORTS as readonly string[]).includes(props.current ?? "");
  const [other, setOther] = useState(Boolean(props.current) && !listed);
  const [text, setText] = useState(listed ? "" : (props.current ?? ""));
  const typed = text.trim();

  return (
    <div className={`flex w-full flex-col items-center ${props.className ?? ""}`}>
      <div className="flex flex-wrap justify-center gap-2.5">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => props.onPick(s)}
            aria-pressed={props.current === s}
            className={`${chip} ${props.current === s ? on : off}`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOther(true)}
          aria-expanded={other}
          className={`${chip} ${other ? on : off}`}
        >
          Other
        </button>
      </div>
      {other && (
        <form
          className="mt-8 flex w-full max-w-sm items-end gap-3 border-b border-line pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed) props.onPick(typed);
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={SPORT_MAX_CHARS}
            placeholder="Type your sport"
            aria-label="Your sport"
            enterKeyHint="done"
            className="flex-1 bg-transparent text-lg text-paper caret-paper outline-none placeholder:text-paper/25"
          />
          <button
            type="submit"
            disabled={!typed}
            aria-label="Continue"
            className="shrink-0 pb-1 text-paper transition-opacity disabled:opacity-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
