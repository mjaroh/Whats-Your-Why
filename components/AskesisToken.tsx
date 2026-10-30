"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TOKEN_MESSAGES } from "@/lib/tokenRules";
import { AskesisMark } from "./Brand";

type Token = { number: number; day: string; opened: boolean };

const longDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/** A token: the A-mark struck on a coin. */
export function TokenCoin({
  size,
  className = "",
  glow = false,
}: {
  size: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative flex shrink-0 items-center justify-center rounded-full border-2 border-paper bg-ink text-paper ${
        glow ? "token-glow" : ""
      } ${className}`}
    >
      <span className="absolute inset-[7%] rounded-full border border-paper/30" />
      <span style={{ height: size * 0.48 }} className="flex">
        <AskesisMark title="" className="h-full w-auto" />
      </span>
    </span>
  );
}

/**
 * Shown on the habit tracker the moment a day earns a token: the A appears,
 * then the congratulations, and scrolling down says where to find it.
 */
export function TokenCelebration({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="You earned an Askesis token"
      className="about-sheet fixed inset-0 z-40 overflow-y-auto bg-ink"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))] right-5 z-10 px-2 text-2xl leading-none text-paper/70"
      >
        ×
      </button>
      <section className="flex min-h-full flex-col items-center justify-center px-6 py-24 text-center">
        <div className="token-arrive">
          <AskesisMark title="Askesis" className="h-40 w-auto text-paper" />
        </div>
        <p className="token-words font-display mt-12 max-w-sm text-3xl leading-tight font-bold tracking-tight">
          Congratulations! You&rsquo;ve earned one Askesis token!
        </p>
        <p className="token-hint mt-16 text-xs tracking-[0.2em] text-mute uppercase" aria-hidden>
          Scroll ↓
        </p>
      </section>
      <section className="mx-auto flex min-h-[70%] max-w-md flex-col items-center px-6 pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] text-center">
        <p className="text-lg leading-relaxed text-paper/80">
          Head to your profile and click the new emblem that is revealed on your page. You&rsquo;ll be able to see all
          the Askesis tokens that you earn over your journey, with a special message from a special person.
        </p>
        <a
          href="/profile"
          className="mt-10 block w-full bg-paper px-6 py-4 text-xs tracking-[0.2em] text-ink uppercase transition-opacity hover:opacity-85"
        >
          Go to my profile
        </a>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs tracking-[0.2em] text-mute uppercase hover:text-paper"
        >
          Back to my habits
        </button>
      </section>
    </div>,
    document.body,
  );
}

/**
 * The profile emblem. Hidden until the first token is earned; tapping it
 * opens every token, and tapping a token opens its message.
 */
export function TokenEmblem({ className = "" }: { className?: string }) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<Token | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tokens?: Token[] } | null) => d?.tokens && setTokens(d.tokens))
      .catch(() => {});
  }, []);

  if (!tokens || tokens.length === 0) return null;
  const fresh = tokens.some((t) => !t.opened);

  function read(t: Token) {
    setReading(t);
    if (t.opened) return;
    setTokens((all) => all && all.map((x) => (x.day === t.day ? { ...x, opened: true } : x)));
    void fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: t.day }),
    }).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Askesis tokens: ${tokens.length}${fresh ? ", new" : ""}`}
        className={`rise flex flex-col items-center ${className}`}
      >
        <span className="relative">
          <TokenCoin size={64} glow={fresh} />
          <span className="absolute -right-1 -bottom-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-ink bg-paper px-1.5 text-xs font-bold text-ink tabular-nums">
            {tokens.length}
          </span>
        </span>
        <span className="mt-2 text-[10px] tracking-[0.2em] text-mute uppercase">
          {fresh ? "New token" : "Askesis tokens"}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your Askesis tokens"
            className="about-sheet fixed inset-0 z-40 overflow-y-auto bg-ink"
          >
            <button
              type="button"
              onClick={() => (reading ? setReading(null) : setOpen(false))}
              aria-label={reading ? "Back to your tokens" : "Close"}
              className="fixed top-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))] right-5 z-10 px-2 text-2xl leading-none text-paper/70"
            >
              {reading ? "←" : "×"}
            </button>
            <div className="mx-auto w-full max-w-xl px-6 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))]">
              {reading ? (
                <TokenMessageView token={reading} />
              ) : (
                <>
                  <h2 className="font-display text-3xl font-bold tracking-tight">ASKESIS TOKENS</h2>
                  <p className="mt-3 text-sm leading-relaxed text-paper/60">
                    One for every day you check off all your must dos, at least one want to do and one wish to do, and
                    sleep at least 9½ hours. Tap a token to open its message.
                  </p>
                  <ul className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8">
                    {tokens.map((t) => (
                      <li key={t.day}>
                        <button
                          type="button"
                          onClick={() => read(t)}
                          className="flex w-full flex-col items-center"
                          aria-label={`Token ${t.number}, ${longDate(t.day)}${t.opened ? "" : ", not opened yet"}`}
                        >
                          <TokenCoin size={80} glow={!t.opened} />
                          <span className="mt-3 text-xs font-bold tabular-nums">No. {t.number}</span>
                          <span className="mt-1 text-[10px] tracking-[0.15em] text-mute uppercase">
                            {new Date(`${t.day}T12:00:00Z`).toLocaleDateString(undefined, {
                              timeZone: "UTC",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TokenMessageView({ token }: { token: Token }) {
  const message = TOKEN_MESSAGES[token.number];
  return (
    <div className="rise flex flex-col items-center text-center">
      <TokenCoin size={112} />
      <p className="mt-6 text-xs tracking-[0.2em] text-mute uppercase">
        Token No. {token.number} · {longDate(token.day)}
      </p>
      {message ? (
        <>
          <blockquote className="font-display mt-12 text-2xl leading-snug font-bold tracking-tight">
            &ldquo;{message.quote}&rdquo;
          </blockquote>
          <p className="mt-5 text-sm tracking-[0.15em] text-paper/70 uppercase">{message.source}</p>
          {message.link && (
            <a
              href={message.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-12 block w-full max-w-xs bg-paper px-6 py-4 text-xs tracking-[0.2em] text-ink uppercase transition-opacity hover:opacity-85"
            >
              {message.link.label}
            </a>
          )}
        </>
      ) : (
        <p className="mt-12 text-lg leading-relaxed text-paper/70">
          This token&rsquo;s message is on its way. Keep training.
        </p>
      )}
    </div>
  );
}
