"use client";

import { useClerk } from "@clerk/nextjs";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crisis } from "./Crisis";

type Msg = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "checkin";
};

export function Coach(props: {
  firstName: string | null;
  statement: string | null;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [checkingIn, setCheckingIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Today's check-in, created once per local day.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch("/api/coach/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tz }),
    })
      .then((r) => r.json())
      .then((data: { created?: boolean; text?: string }) => {
        if (data.created && data.text) {
          setMessages((m) => [
            ...m,
            { id: `checkin-${Date.now()}`, role: "assistant", content: data.text!, kind: "checkin" },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingIn(false));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text, kind: "chat" };
    const replyId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("application/json")) {
        const data = (await res.json()) as { type?: string; error?: string };
        if (data.type === "crisis") {
          setCrisis(true);
          return;
        }
        throw new Error(data.error ?? "Something went wrong.");
      }
      if (!res.body) throw new Error("Something went wrong.");

      // Stream the reply in as it's written.
      setMessages((m) => [...m, { id: replyId, role: "assistant", content: "", kind: "chat" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) => (msg.id === replyId ? { ...msg, content: msg.content + chunk } : msg)),
        );
      }
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== userMsg.id && msg.id !== replyId));
      setDraft(text);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }, [draft, pending]);

  if (crisis) {
    return (
      <Crisis
        onBack={() => {
          setCrisis(false);
          setMessages((m) => m.slice(0, -1));
        }}
      />
    );
  }

  const streaming = pending && messages[messages.length - 1]?.role === "assistant";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <Header />

      <div className="flex flex-1 flex-col justify-end gap-7 pt-6 pb-8" aria-live="polite">
        {props.statement && (
          <p className="font-display border-b border-line pb-8 text-lg leading-snug font-bold tracking-tight text-paper/50">
            &ldquo;{props.statement}&rdquo;
          </p>
        )}
        {messages.length === 0 && !checkingIn && (
          <p className="text-lg leading-relaxed text-paper">
            {props.firstName ? `${props.firstName}, what's` : "What's"} on your mind today?
          </p>
        )}
        {messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="rise">
              {m.kind === "checkin" && (
                <p className="mb-2 text-xs tracking-[0.2em] text-mute uppercase">Today&rsquo;s check-in</p>
              )}
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-paper">{m.content}</p>
            </div>
          ) : (
            <p
              key={m.id}
              className="border-l border-line pl-4 text-base leading-relaxed whitespace-pre-wrap text-paper/60"
            >
              {m.content}
            </p>
          ),
        )}
        {((pending && !streaming) || (checkingIn && messages.length === 0)) && <Thinking />}
      </div>

      <div className="sticky bottom-0 bg-ink pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {error && <p className="mb-3 text-sm text-mute">{error}</p>}
        <div className="flex items-end gap-3 border-t border-line pt-4">
          <Composer
            inputRef={inputRef}
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            disabled={pending}
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || pending}
            aria-label="Send"
            className="shrink-0 pb-1.5 text-paper transition-opacity disabled:opacity-0"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}

function Composer(props: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const { inputRef } = props;
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value, inputRef]);

  return (
    <textarea
      ref={inputRef}
      rows={1}
      value={props.value}
      maxLength={2000}
      placeholder="Talk to your coach"
      aria-label="Message your coach"
      enterKeyHint="send"
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          props.onSubmit();
        }
      }}
      className="block max-h-[40dvh] flex-1 resize-none overflow-y-auto bg-transparent text-lg leading-relaxed text-paper caret-paper outline-none placeholder:text-paper/25"
    />
  );
}

function Thinking() {
  return (
    <div className="flex gap-1.5 py-2" aria-label="Thinking">
      {[0, 1, 2].map((d) => (
        <span
          key={d}
          className="breathe h-1.5 w-1.5 rounded-full bg-paper"
          style={{ animationDelay: `${d * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { signOut } = useClerk();

  async function manage() {
    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) window.location.href = data.url;
  }

  const item = "block w-full px-5 py-3 text-left text-sm text-paper/80 hover:bg-paper/5";
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-ink/90 pt-5 pb-4 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/askesis-mark.png" alt="Askesis" width={21} height={32} className="h-8 w-auto opacity-90" />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="px-2 py-1 text-xl leading-none text-paper/70"
        >
          •••
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 border border-line bg-ink py-2">
            <a href="/?retake=1" className={item}>
              Retake the Seven Whys
            </a>
            <button type="button" onClick={manage} className={item}>
              Manage membership
            </button>
            <button type="button" onClick={() => signOut({ redirectUrl: "/" })} className={item}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
