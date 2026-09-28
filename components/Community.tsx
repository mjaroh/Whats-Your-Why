"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GROUP_MAX_CHARS } from "@/lib/constants";
import { AppNav } from "./AppNav";
import { Crisis } from "./Crisis";

type GroupMsg = {
  id: number;
  username: string | null;
  kind: "chat" | "checkin";
  content: string;
  mine: boolean;
};

const POLL_MS = 4000;

export function Community(props: {
  me: string;
  member: boolean;
  admin: boolean;
  banned: boolean;
  initialMessages: GroupMsg[];
}) {
  const [messages, setMessages] = useState<GroupMsg[]>(props.initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idsRef = useRef({ first: 0, last: 0 });

  useEffect(() => {
    idsRef.current = {
      first: messages[0]?.id ?? 0,
      last: messages[messages.length - 1]?.id ?? 0,
    };
  }, [messages]);

  const merge = useCallback((incoming: GroupMsg[], hidden: number[] = []) => {
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const gone = new Set(hidden);
      return [...current, ...incoming.filter((m) => !seen.has(m.id))]
        .filter((m) => !gone.has(m.id))
        .sort((a, b) => a.id - b.id);
    });
  }, []);

  // Live updates by polling while the tab is visible.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const { first, last } = idsRef.current;
      const res = await fetch(`/api/group?after=${last}&since=${first}`).catch(() => null);
      if (!res?.ok || stopped) return;
      const data = (await res.json()) as { messages: GroupMsg[]; hidden: number[] };
      merge(data.messages, data.hidden);
    };
    void poll();
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [merge]);

  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [lastId]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = (await res.json()) as {
        type?: "posted" | "blocked" | "crisis";
        message?: GroupMsg;
        reason?: string;
        error?: string;
      };
      if (data.type === "crisis") {
        setDraft("");
        setCrisis(true);
      } else if (data.type === "posted" && data.message) {
        setDraft("");
        merge([data.message]);
      } else {
        setNotice(data.reason ?? data.error ?? "Couldn't send that. Try again.");
      }
    } catch {
      setNotice("Connection lost. Try again.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, merge]);

  async function act(msg: GroupMsg, action: "report" | "delete" | "ban") {
    setMenuFor(null);
    const res =
      action === "report"
        ? await fetch("/api/group/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id }),
          }).catch(() => null)
        : await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, messageId: msg.id }),
          }).catch(() => null);
    if (!res?.ok) {
      setNotice("That didn't go through. Try again.");
      return;
    }
    if (action === "ban") {
      setMessages((m) => m.filter((x) => x.username !== msg.username || x.kind === "checkin"));
    } else {
      setMessages((m) => m.filter((x) => x.id !== msg.id));
    }
    setNotice(
      action === "report"
        ? "Reported. Thanks for looking out. We'll review it."
        : action === "ban"
          ? `${msg.username} is banned and their messages are removed.`
          : "Message removed.",
    );
  }

  if (crisis) return <Crisis onBack={() => setCrisis(false)} backLabel="Back to the group" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6">
      <AppNav active="group" member={props.member} admin={props.admin} />

      <div className="flex flex-1 flex-col justify-end gap-6 pt-6 pb-8" aria-live="polite">
        <div className="border-b border-line pb-6 text-sm leading-relaxed text-mute">
          <p>
            Be for each other. Every message is checked before it posts. No phone numbers, socials
            or meetups, and keep personal details out.
          </p>
          {!props.member && (
            <a href="/coach" className="mt-3 inline-block text-paper/70 underline-offset-4 hover:underline">
              Want your own private coach? →
            </a>
          )}
        </div>

        {messages.map((m) =>
          m.kind === "checkin" ? (
            <div key={m.id} className="rise border border-line px-5 py-5">
              <p className="text-xs tracking-[0.2em] text-mute uppercase">Today&rsquo;s check-in · Askesis</p>
              <p className="font-display mt-3 text-xl leading-snug font-bold tracking-tight">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="group relative">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs tracking-[0.15em] text-mute uppercase">
                  {m.mine ? "You" : (m.username ?? "athlete")}
                </p>
                {(!m.mine || props.admin) && (
                  <button
                    type="button"
                    aria-label="Message options"
                    onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                    className="px-1 text-sm leading-none text-paper/30 hover:text-paper/70"
                  >
                    •••
                  </button>
                )}
              </div>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap text-paper/90">{m.content}</p>
              {menuFor === m.id && (
                <div className="absolute top-6 right-0 z-10 w-48 border border-line bg-ink py-1 text-sm">
                  {!m.mine && (
                    <button type="button" onClick={() => act(m, "report")} className={menuItem}>
                      Report
                    </button>
                  )}
                  {props.admin && (
                    <>
                      <button type="button" onClick={() => act(m, "delete")} className={menuItem}>
                        Delete message
                      </button>
                      {!m.mine && (
                        <button type="button" onClick={() => act(m, "ban")} className={menuItem}>
                          Ban {m.username}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="sticky bottom-0 bg-ink pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {notice && <p className="mb-3 text-sm text-mute">{notice}</p>}
        {props.banned ? (
          <p className="border-t border-line pt-4 text-sm text-mute">Your account can&rsquo;t post in the group.</p>
        ) : (
          <div className="flex items-end gap-3 border-t border-line pt-4">
            <GroupComposer inputRef={inputRef} value={draft} onChange={setDraft} onSubmit={send} disabled={sending} />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() || sending}
              aria-label="Send"
              className="shrink-0 pb-1.5 text-paper transition-opacity disabled:opacity-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </div>
        )}
        {draft.length > GROUP_MAX_CHARS - 100 && (
          <p className="mt-2 text-right text-xs text-mute">
            {draft.length}/{GROUP_MAX_CHARS}
          </p>
        )}
      </div>
    </main>
  );
}

const menuItem = "block w-full px-4 py-2.5 text-left text-paper/80 hover:bg-paper/5";

function GroupComposer(props: {
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
      maxLength={GROUP_MAX_CHARS}
      placeholder="Message the group"
      aria-label="Message the group"
      enterKeyHint="send"
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          props.onSubmit();
        }
      }}
      className="block max-h-[30dvh] flex-1 resize-none overflow-y-auto bg-transparent text-lg leading-relaxed text-paper caret-paper outline-none placeholder:text-paper/25 disabled:opacity-50"
    />
  );
}
