"use client";

import { useState } from "react";

/**
 * A small "Log in" at the very bottom of the first screens, for athletes who
 * already have an account and got signed out. It asks first: log in, or
 * start fresh with the Seven Whys (which is where they already are).
 */
export function LoginPrompt() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-3 py-2 text-xs tracking-[0.2em] text-paper/45 uppercase hover:text-paper"
      >
        Log in
      </button>
      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/70"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-label="Log in"
            onClick={(e) => e.stopPropagation()}
            className="rise mx-auto w-full max-w-md border-t border-line bg-ink px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center"
          >
            <a href="/sign-in" className="block w-full bg-paper py-4 text-sm tracking-[0.2em] text-ink uppercase">
              Log in
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full border border-paper/40 py-4 text-sm tracking-[0.2em] uppercase hover:border-paper"
            >
              I don&rsquo;t have an account
            </button>
          </div>
        </div>
      )}
    </>
  );
}
