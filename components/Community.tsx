"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { prepareAndUpload, stageLabel, UserFacingError, type SendStage } from "@/lib/client/media";
import { GROUP_MAX_CHARS } from "@/lib/constants";
import { AppNav } from "./AppNav";
import { AppShell, scrollToEnd } from "./AppShell";
import { Crisis } from "./Crisis";
import { Avatar, SaveStar, VideoButton, VideoPlayer } from "./MediaBits";

type GroupMsg = {
  id: number;
  username: string | null;
  hasAvatar: boolean;
  kind: "chat" | "checkin";
  content: string;
  mediaId: number | null;
  approved: boolean;
  mine: boolean;
};

const POLL_MS = 4000;

export function Community(props: {
  me: string;
  member: boolean;
  admin: boolean;
  banned: boolean;
  videoEnabled: boolean;
  savedIds: number[];
  initialMessages: GroupMsg[];
}) {
  const [messages, setMessages] = useState<GroupMsg[]>(props.initialMessages);
  const [saved, setSaved] = useState<Set<number>>(() => new Set(props.savedIds));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState<SendStage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);
  const idsRef = useRef({ first: 0, last: 0 });
  const serverTimeRef = useRef<string | null>(null);

  useEffect(() => {
    idsRef.current = {
      first: messages[0]?.id ?? 0,
      last: messages[messages.length - 1]?.id ?? 0,
    };
  }, [messages]);

  const merge = useCallback((incoming: GroupMsg[], hidden: number[] = []) => {
    setMessages((current) => {
      const byId = new Map(current.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m); // newer copy wins (e.g. now approved)
      const gone = new Set(hidden);
      return [...byId.values()].filter((m) => !gone.has(m.id)).sort((a, b) => a.id - b.id);
    });
  }, []);

  // Live updates by polling while the tab is visible.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const { first, last } = idsRef.current;
      const approved = serverTimeRef.current ? `&approvedAfter=${encodeURIComponent(serverTimeRef.current)}` : "";
      const res = await fetch(`/api/group?after=${last}&since=${first}${approved}`).catch(() => null);
      if (!res?.ok || stopped) return;
      const data = (await res.json()) as { messages: GroupMsg[]; hidden: number[]; serverTime: string };
      serverTimeRef.current = data.serverTime;
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
    scrollToEnd(scrollRef.current, !firstScroll.current);
    firstScroll.current = false;
  }, [lastId]);

  type PostResult = { type?: "posted" | "pending" | "blocked" | "crisis"; message?: GroupMsg; reason?: string; error?: string };

  function handleResult(data: PostResult) {
    if (data.type === "crisis") {
      setDraft("");
      setCrisis(true);
    } else if ((data.type === "posted" || data.type === "pending") && data.message) {
      setDraft("");
      merge([data.message]);
      if (data.type === "pending") setNotice("Your video is in. It'll show for everyone once it's approved.");
    } else {
      setNotice(data.reason ?? data.error ?? "Couldn't send that. Try again.");
    }
  }

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
      handleResult((await res.json()) as PostResult);
    } catch {
      setNotice("Connection lost. Try again.");
    } finally {
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, sending, merge]);

  // The typed text (if any) goes along as the video's caption.
  async function sendVideo(file: File) {
    if (sending) return;
    setSending(true);
    setNotice(null);
    try {
      const { mediaId, frames } = await prepareAndUpload(file, "group", setStage);
      const res = await fetch("/api/group/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, frames, caption: draft.trim() }),
      });
      handleResult((await res.json()) as PostResult);
    } catch (err) {
      setNotice(err instanceof UserFacingError ? err.message : "Couldn't send that video. Try again.");
    } finally {
      setStage(null);
      setSending(false);
    }
  }

  async function act(msg: GroupMsg, action: "report" | "delete" | "ban" | "removePhoto") {
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
    } else if (action === "removePhoto") {
      setMessages((m) => m.map((x) => (x.username === msg.username ? { ...x, hasAvatar: false } : x)));
    } else {
      setMessages((m) => m.filter((x) => x.id !== msg.id));
    }
    setNotice(
      action === "report"
        ? "Reported. Thanks for looking out. We'll review it."
        : action === "ban"
          ? `${msg.username} is banned and their messages are removed.`
          : action === "removePhoto"
            ? `${msg.username}'s photo was removed.`
            : "Message removed.",
    );
  }

  function setStar(id: number, on: boolean) {
    setSaved((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (crisis) return <Crisis onBack={() => setCrisis(false)} backLabel="Back to the group" />;

  return (
    <AppShell
      scrollRef={scrollRef}
      header={<AppNav active="group" member={props.member} admin={props.admin} />}
      footer={
        <div className="mx-auto w-full max-w-2xl shrink-0 px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {stage && <p className="mb-3 text-sm text-paper/70">{stageLabel(stage, "group")}</p>}
          {notice && !stage && <p className="mb-3 text-sm text-mute">{notice}</p>}
          {props.banned ? (
            <p className="border-t border-line pt-4 text-sm text-mute">Your account can&rsquo;t post in the group.</p>
          ) : (
            <div className="flex items-end gap-3 border-t border-line pt-4">
              {props.videoEnabled && <VideoButton disabled={sending} onPick={sendVideo} />}
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
      }
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end gap-6 px-6 pt-6 pb-8"
        aria-live="polite"
      >
        <div className="border-b border-line pb-6 text-sm leading-relaxed text-mute">
          <p>
            Be for each other. Every message is checked before it posts, and videos are approved
            before everyone sees them. No phone numbers, socials or meetups, and keep personal
            details out.
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs tracking-[0.2em] text-mute uppercase">Today&rsquo;s check-in · Askesis</p>
                <SaveStar source="group" messageId={m.id} saved={saved.has(m.id)} onChange={(on) => setStar(m.id, on)} />
              </div>
              <p className="font-display mt-3 text-xl leading-snug font-bold tracking-tight">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="relative flex gap-3">
              <Avatar username={m.username} hasAvatar={m.hasAvatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs tracking-[0.15em] text-mute uppercase">
                    {m.mine ? "You" : (m.username ?? "athlete")}
                    {m.mediaId && !m.approved && (
                      <span className="ml-2 tracking-normal normal-case text-paper/50">· Waiting for approval</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    {m.approved && (
                      <SaveStar source="group" messageId={m.id} saved={saved.has(m.id)} onChange={(on) => setStar(m.id, on)} />
                    )}
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
                </div>
                {m.mediaId && <VideoPlayer mediaId={m.mediaId} />}
                {m.content && <p className="mt-1 leading-relaxed whitespace-pre-wrap text-paper/90">{m.content}</p>}
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
                        {m.hasAvatar && (
                          <button type="button" onClick={() => act(m, "removePhoto")} className={menuItem}>
                            Remove {m.username}&rsquo;s photo
                          </button>
                        )}
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
            </div>
          ),
        )}
      </div>
    </AppShell>
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
