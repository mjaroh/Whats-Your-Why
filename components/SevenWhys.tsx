"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FIRST_QUESTION,
  MAX_ANSWER_CHARS,
  type ChatMessage,
  type WhyResponse,
} from "@/lib/constants";
import { ProgressDots } from "./ProgressDots";
import { Continue } from "./Continue";
import { JoinMembership, type WhyAnswers } from "./JoinMembership";
import { Crisis } from "./Crisis";
import { AppShell, scrollToEnd } from "./AppShell";
import { SPORT_MAX_CHARS, SPORTS } from "@/lib/sports";

type Phase = "sport" | "ask" | "result" | "continue" | "crisis";

// The conversation lives only in this component's memory. Nothing is stored
// unless the athlete creates an account (or is signed in) and chooses to keep
// their why for the coach.
export function SevenWhys({
  membership = false,
  signedIn = false,
}: {
  /** Accounts and the paid coach are switched on. */
  membership?: boolean;
  /** Already a member retaking the exercise. */
  signedIn?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("sport");
  const [sport, setSport] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: FIRST_QUESTION },
  ]);
  const [answered, setAnswered] = useState(0);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [answers, setAnswers] = useState<WhyAnswers>([]);

  const submit = useCallback(async () => {
    const answer = draft.trim();
    if (!answer || pending) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: answer }];
    setMessages(history);
    setDraft("");
    setError(null);
    setPending(true);

    let data: WhyResponse;
    try {
      const res = await fetch("/api/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, answered, sport }),
      });
      data = (await res.json()) as WhyResponse;
    } catch {
      data = { type: "error", text: "Connection lost. Try sending that again." };
    }
    setPending(false);

    switch (data.type) {
      case "question":
        setMessages([...history, { role: "assistant", content: data.text }]);
        setAnswered(data.answered);
        break;
      case "final":
        setAnswers(pairAnswers(history));
        setAnswered(data.answered);
        setStatement(data.text);
        setPhase("result");
        break;
      case "crisis":
        // Stop the exercise and drop what was said from memory.
        setMessages([]);
        setStatement("");
        setPhase("crisis");
        break;
      default:
        // Put the answer back so nothing they wrote is lost.
        setMessages(messages);
        setDraft(answer);
        setError(data.text);
    }
  }, [draft, pending, messages, answered, sport]);

  if (phase === "crisis") return <Crisis />;
  if (phase === "sport") {
    return (
      <SportPicker
        onPick={(s) => {
          setSport(s);
          setPhase("ask");
        }}
      />
    );
  }
  if (phase === "continue") {
    return membership ? (
      <JoinMembership statement={statement} answers={answers} sport={sport} signedIn={signedIn} />
    ) : (
      <Continue />
    );
  }
  if (phase === "result") {
    return <Result statement={statement} onContinue={() => setPhase("continue")} />;
  }

  const started = messages.length > 1;
  return started ? (
    <Conversation
      messages={messages}
      answered={answered}
      draft={draft}
      setDraft={setDraft}
      onSubmit={submit}
      pending={pending}
      error={error}
    />
  ) : (
    <Landing
      draft={draft}
      setDraft={setDraft}
      onSubmit={submit}
      error={error}
      sport={sport}
      onChangeSport={() => setPhase("sport")}
    />
  );
}

/** Question/answer pairs, in order, for the coach to build on. */
function pairAnswers(history: ChatMessage[]): WhyAnswers {
  const out: WhyAnswers = [];
  history.forEach((m, i) => {
    const next = history[i + 1];
    if (m.role === "assistant" && next?.role === "user") {
      out.push({ question: m.content, answer: next.content });
    }
  });
  return out;
}

/* ---------- Screen 0: Sport ---------- */

const chip =
  "border border-paper/30 px-4 py-2.5 text-xs tracking-[0.15em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink";

function SportPicker({ onPick }: { onPick: (sport: string) => void }) {
  const [other, setOther] = useState(false);
  const [text, setText] = useState("");
  const typed = text.trim();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pt-24 pb-16">
      <div className="rise flex w-full max-w-xl flex-col items-center">
        <h1 className="font-display text-center text-4xl font-bold tracking-tight sm:text-5xl">
          What&rsquo;s your sport?
        </h1>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {SPORTS.map((s) => (
            <button key={s} type="button" onClick={() => onPick(s)} className={chip}>
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOther(true)}
            aria-expanded={other}
            className={`${chip} ${other ? "border-paper bg-paper text-ink" : ""}`}
          >
            Other
          </button>
        </div>
        {other && (
          <form
            className="mt-8 flex w-full max-w-sm items-end gap-3 border-b border-line pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed) onPick(typed);
            }}
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={SPORT_MAX_CHARS}
              placeholder="Type your sport"
              aria-label="Your sport"
              enterKeyHint="next"
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
    </main>
  );
}

/* ---------- Screen 1: Landing ---------- */

function Landing(props: {
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  sport: string | null;
  onChangeSport: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Typing anywhere on the page goes straight into the answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || document.activeElement === el) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      el.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main
      className="flex min-h-dvh cursor-text flex-col items-center justify-center px-6"
      onClick={() => ref.current?.focus()}
    >
      <div className="flex w-full max-w-xl flex-col items-center">
        {props.sport && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onChangeSport();
            }}
            className="mb-6 text-xs tracking-[0.2em] text-mute uppercase hover:text-paper"
          >
            {props.sport} · change
          </button>
        )}
        <h1 className="font-display text-center text-4xl font-bold tracking-tight sm:text-5xl">
          {FIRST_QUESTION}
        </h1>
        <div className="mt-8 w-full">
          <AnswerBox
            inputRef={ref}
            value={props.draft}
            onChange={props.setDraft}
            onSubmit={props.onSubmit}
            align="center"
            label={FIRST_QUESTION}
          />
        </div>
        {props.error && <p className="mt-6 text-sm text-mute">{props.error}</p>}
      </div>
    </main>
  );
}

/* ---------- Screen 2: Conversation ---------- */

function Conversation(props: {
  messages: ChatMessage[];
  answered: number;
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToEnd(scrollRef.current);
    if (!props.pending) ref.current?.focus({ preventScroll: true });
  }, [props.messages.length, props.pending]);

  const lastIndex = props.messages.length - 1;

  return (
    <AppShell
      scrollRef={scrollRef}
      header={
        <header className="top-bar flex justify-center pb-5">
          <ProgressDots filled={props.answered} />
        </header>
      }
      footer={
        <div className="mx-auto w-full max-w-2xl shrink-0 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {props.error && <p className="mb-3 text-sm text-mute">{props.error}</p>}
          <div className="border-t border-line pt-4">
            <AnswerBox
              inputRef={ref}
              value={props.draft}
              onChange={props.setDraft}
              onSubmit={props.onSubmit}
              disabled={props.pending}
              align="left"
              label="Your answer"
            />
          </div>
        </div>
      }
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end gap-8 px-6 pt-10 pb-8"
        aria-live="polite"
      >
        {props.messages.map((m, i) =>
          m.role === "assistant" ? (
            <p
              key={i}
              className={`font-display font-bold tracking-tight ${
                i === lastIndex
                  ? "rise text-2xl text-paper sm:text-3xl"
                  : "text-lg text-paper/45 sm:text-xl"
              }`}
            >
              {m.content}
            </p>
          ) : (
            <p
              key={i}
              className="border-l border-line pl-4 text-base leading-relaxed whitespace-pre-wrap text-paper/60"
            >
              {m.content}
            </p>
          ),
        )}
        {props.pending && (
          <div className="flex gap-1.5 py-2" aria-label="Thinking">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="breathe h-1.5 w-1.5 rounded-full bg-paper"
                style={{ animationDelay: `${d * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ---------- Shared input ---------- */

function AnswerBox(props: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  align: "center" | "left";
  label: string;
}) {
  const { inputRef } = props;

  // Grow with content.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value, inputRef]);

  const center = props.align === "center";
  const hasText = props.value.trim().length > 0;

  return (
    <div className="relative flex items-end gap-3">
      <div className="relative flex-1">
        <textarea
          ref={inputRef}
          autoFocus
          rows={1}
          value={props.value}
          maxLength={MAX_ANSWER_CHARS}
          disabled={props.disabled}
          aria-label={props.label}
          enterKeyHint="send"
          autoComplete="off"
          spellCheck
          onChange={(e) => props.onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              props.onSubmit();
            }
          }}
          className={`block max-h-[40dvh] w-full resize-none overflow-y-auto bg-transparent text-lg leading-relaxed text-paper outline-none disabled:opacity-40 sm:text-xl ${
            center ? "text-center" : "text-left"
          } ${props.value ? "caret-paper" : "caret-transparent"}`}
        />
        {/* Our own blinking cursor while empty: always visible, even before
            focus lands (iOS won't autofocus without a tap). */}
        {!props.value && !props.disabled && (
          <span
            aria-hidden
            className={`cursor-blink pointer-events-none absolute top-1/2 h-[1.3em] w-[2px] -translate-y-1/2 bg-paper text-lg sm:text-xl ${
              center ? "left-1/2" : "left-0"
            }`}
          />
        )}
      </div>
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={!hasText || props.disabled}
        aria-label="Send"
        className={`shrink-0 pb-1.5 text-paper transition-opacity duration-300 ${
          hasText && !props.disabled ? "opacity-70 hover:opacity-100" : "pointer-events-none opacity-0"
        } ${center ? "absolute right-0 bottom-0" : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  );
}

/* ---------- Screen 3: Result ---------- */

function Result({ statement, onContinue }: { statement: string; onContinue: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <blockquote className="rise max-w-3xl text-center">
        <p className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
          &ldquo;{statement}&rdquo;
        </p>
      </blockquote>
      <button
        type="button"
        onClick={onContinue}
        className="rise mt-16 border border-paper/40 px-6 py-3.5 text-sm tracking-[0.12em] whitespace-nowrap uppercase sm:tracking-[0.2em] transition-colors hover:border-paper hover:bg-paper hover:text-ink"
        style={{ animationDelay: "0.6s" }}
      >
        Would you like to continue?
      </button>
    </main>
  );
}
