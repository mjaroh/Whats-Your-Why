"use client";

import { useRef, useState } from "react";

/** Profile photo, or the first letter of the username if there isn't one. */
export function Avatar(props: { username: string | null; hasAvatar: boolean; size?: number; version?: number }) {
  const [failed, setFailed] = useState(false);
  const size = props.size ?? 28;
  const letter = (props.username ?? "?").slice(0, 1).toUpperCase();
  if (props.hasAvatar && props.username && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${encodeURIComponent(props.username)}${props.version ? `?v=${props.version}` : ""}`}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="font-display flex shrink-0 items-center justify-center rounded-full border border-line text-paper/70"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </span>
  );
}

export function VideoPlayer({ mediaId }: { mediaId: number }) {
  return (
    <video
      controls
      playsInline
      preload="none"
      poster={`/api/media/${mediaId}?poster=1`}
      src={`/api/media/${mediaId}`}
      className="mt-2 max-h-[60dvh] w-full border border-line bg-black object-contain"
    />
  );
}

/** Saves a message to the athlete's profile. */
export function SaveStar(props: { source: "coach" | "group"; messageId: number; saved: boolean; onChange: (on: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    const on = !props.saved;
    props.onChange(on);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: props.source, messageId: props.messageId, on }),
    }).catch(() => null);
    if (!res?.ok) props.onChange(!on);
    setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={props.saved ? "Remove from saved" : "Save to profile"}
      aria-pressed={props.saved}
      className={`px-1 text-base leading-none transition-colors ${props.saved ? "text-paper" : "text-paper/30 hover:text-paper/70"}`}
    >
      {props.saved ? "★" : "☆"}
    </button>
  );
}

/** Opens the phone's camera roll or camera for a video. */
export function VideoButton(props: { disabled: boolean; onPick: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={props.disabled}
        aria-label="Send a video"
        className="shrink-0 pb-1.5 text-paper/60 transition-opacity hover:text-paper disabled:opacity-30"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="6" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15.5 10.5 21 7.5v9l-5.5-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </button>
      <input
        ref={ref}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) props.onPick(file);
        }}
      />
    </>
  );
}
