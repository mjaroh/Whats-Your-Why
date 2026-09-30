"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { prepareAndUpload, stageLabel, UserFacingError, type SendStage } from "@/lib/client/media";
import { REPLY_ID_MARKER } from "@/lib/constants";
import { AppNav } from "./AppNav";
import { Crisis } from "./Crisis";
import { SaveStar, VideoButton, VideoPlayer } from "./MediaBits";

// Numeric ids are saved messages; string ids are still arriving.
type Msg = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "checkin";
  mediaId?: number | null;
};

export function Coach(props: {
  firstName: string | null;
  statement: string | null;
  initialMessages: Msg[];
  admin: boolean;
  videoEnabled: boolean;
  savedIds: number[];
}) {
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [checkingIn, setCheckingIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [stage, setStage] = useState<SendStage | null>(null);
  const [saved, setSaved] = useState<Set<number>>(() => new Set(props.savedIds));
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
      .then((data: { created?: boolean; id?: number; text?: string }) => {
        if (data.created && data.text) {
          setMessages((m) => [
            ...m,
            { id: data.id ?? `checkin-${Date.now()}`, role: "assistant", content: data.text!, kind: "checkin" },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingIn(false));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  /**
   * Sends one athlete turn (text, or a finished video upload) and streams the
   * coach's reply in. The stream ends with the reply's saved id.
   */
  async function exchange(opts: {
    userMsg: Msg;
    request: () => Promise<Response>;
    onFail: () => void;
  }) {
    const replyId = `a-${Date.now()}`;
    setMessages((m) => [...m, opts.userMsg]);
    setError(null);
    setPending(true);
    try {
      const res = await opts.request();
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
      const userId = Number(res.headers.get("x-user-message-id")) || opts.userMsg.id;

      setMessages((m) => [
        ...m.map((msg) => (msg.id === opts.userMsg.id ? { ...msg, id: userId } : msg)),
        { id: replyId, role: "assistant", content: "", kind: "chat" },
      ]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const shown = raw.split(REPLY_ID_MARKER)[0];
        setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, content: shown } : msg)));
      }
      const [, meta] = raw.split(REPLY_ID_MARKER);
      const savedId = meta ? (JSON.parse(meta) as { id?: number }).id : undefined;
      if (savedId) setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, id: savedId } : msg)));
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== opts.userMsg.id && msg.id !== replyId));
      opts.onFail();
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    await exchange({
      userMsg: { id: `u-${Date.now()}`, role: "user", content: text, kind: "chat" },
      request: () =>
        fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }),
      onFail: () => setDraft(text),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, pending]);

  // Anything typed goes along as the note for the video ("my back handspring").
  async function sendVideo(file: File) {
    if (pending || stage) return;
    const note = draft.trim();
    setError(null);
    let uploaded;
    try {
      uploaded = await prepareAndUpload(file, "coach", setStage);
    } catch (err) {
      setStage(null);
      setError(err instanceof UserFacingError ? err.message : "Couldn't send that video. Try again.");
      return;
    }
    setDraft("");
    const { mediaId, frames } = uploaded;
    await exchange({
      userMsg: { id: `u-${Date.now()}`, role: "user", content: note, kind: "chat", mediaId },
      request: () =>
        fetch("/api/coach/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId, frames, note }),
        }),
      onFail: () => setDraft(note),
    });
    setStage(null);
  }

  function setStar(id: number, on: boolean) {
    setSaved((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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
      <AppNav active="coach" member admin={props.admin} />

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
              <div className="flex items-start justify-between gap-3">
                {m.kind === "checkin" ? (
                  <p className="mb-2 text-xs tracking-[0.2em] text-mute uppercase">Today&rsquo;s check-in</p>
                ) : (
                  <span />
                )}
                {typeof m.id === "number" && (
                  <SaveStar
                    source="coach"
                    messageId={m.id}
                    saved={saved.has(m.id)}
                    onChange={(on) => setStar(m.id as number, on)}
                  />
                )}
              </div>
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-paper">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="border-l border-line pl-4">
              {m.mediaId && <VideoPlayer mediaId={m.mediaId} />}
              {m.content && (
                <p className="mt-1 text-base leading-relaxed whitespace-pre-wrap text-paper/60">{m.content}</p>
              )}
            </div>
          ),
        )}
        {((pending && !streaming) || (checkingIn && messages.length === 0)) && <Thinking />}
      </div>

      <div className="sticky bottom-0 bg-ink pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {stage && !streaming && <p className="mb-3 text-sm text-paper/70">{stageLabel(stage, "coach")}</p>}
        {error && <p className="mb-3 text-sm text-mute">{error}</p>}
        <div className="flex items-end gap-3 border-t border-line pt-4">
          {props.videoEnabled && <VideoButton disabled={pending || Boolean(stage)} onPick={sendVideo} />}
          <Composer
            inputRef={inputRef}
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            disabled={pending || Boolean(stage)}
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
      placeholder={props.disabled ? "" : "Talk to your coach"}
      disabled={props.disabled}
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
