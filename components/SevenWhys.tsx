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
import { Crisis } from "./Crisis";

type Phase = "ask" | "result" | "continue" | "crisis";

// The conversation lives only in this component's memory. Nothing is
// persisted in the browser or on the server.
export function SevenWhys() {
  const [phase, setPhase] = useState<Phase>("ask");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: FIRST_QUESTION },
  ]);
  const [answered, setAnswered] = useState(0);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState("");

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
        body: JSON.stringify({ messages: history, answered }),
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
  }, [draft, pending, messages, answered]);

  if (phase === "crisis") return <Crisis />;
  if (phase === "continue") return <Continue />;
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
    <Landing draft={draft} setDraft={setDraft} onSubmit={submit} error={error} />
  );
}

/* ---------- Screen 1: Landing ---------- */

function Landing(props: {
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
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

  useEffect(() => {
    // Scroll the page itself to the bottom so the newest line sits above the
    // sticky answer bar rather than behind it.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    if (!props.pending) ref.current?.focus({ preventScroll: true });
  }, [props.messages.length, props.pending]);

  const lastIndex = props.messages.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <header className="sticky top-0 z-[5] flex justify-center bg-ink/90 pt-7 pb-5 backdrop-blur-sm">
        <ProgressDots filled={props.answered} />
      </header>

      <div className="flex flex-1 flex-col justify-end gap-8 pt-10 pb-8" aria-live="polite">
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

      <div className="sticky bottom-0 bg-ink pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
    </main>
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
