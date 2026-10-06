"use client";

import { useRef, useState } from "react";
import { resizePhoto } from "@/lib/client/media";
import { AppNav } from "./AppNav";
import { AppShell } from "./AppShell";
import { Avatar, VideoPlayer } from "./MediaBits";
import { SportChoices } from "./SportChoices";
import { habitsComplete, type Tier } from "@/lib/habitRules";

type CoachVideo = { mediaId: number; note: string; feedback: string | null; at: string };
type Favorite = {
  source: "coach" | "group";
  messageId: number;
  from: string;
  content: string;
  mediaId: number | null;
};

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function Profile(props: {
  username: string;
  hasAvatar: boolean;
  member: boolean;
  admin: boolean;
  photosEnabled: boolean;
  why: string | null;
  sport: string | null;
  habitTiers: Tier[];
  videos: CoachVideo[];
  favorites: Favorite[];
}) {
  const [hasAvatar, setHasAvatar] = useState(props.hasAvatar);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [sport, setSport] = useState(props.sport);
  const [editSport, setEditSport] = useState(false);
  const [sportError, setSportError] = useState<string | null>(null);
  const [openVideo, setOpenVideo] = useState<CoachVideo | null>(null);
  const [favorites, setFavorites] = useState(props.favorites);
  const photoInput = useRef<HTMLInputElement>(null);

  async function changePhoto(file: File) {
    setPhotoStatus("Checking your photo…");
    try {
      const image = await resizePhoto(file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Couldn't save that photo.");
      setHasAvatar(true);
      setPhotoVersion(Date.now());
      setPhotoStatus(null);
    } catch (err) {
      setPhotoStatus(err instanceof Error ? err.message : "Couldn't save that photo.");
    }
  }

  async function saveSport(next: string) {
    setSportError(null);
    const res = await fetch("/api/account/sport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sport: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setSportError("Couldn't save that. Try again.");
      return;
    }
    setSport(next);
    setEditSport(false);
  }

  async function unsave(f: Favorite) {
    setFavorites((list) => list.filter((x) => !(x.source === f.source && x.messageId === f.messageId)));
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: f.source, messageId: f.messageId, on: false }),
    }).catch(() => null);
  }

  return (
    <AppShell header={<AppNav active="profile" member={props.member} admin={props.admin} />}>
      <div className="mx-auto w-full max-w-2xl px-6 pb-[max(4rem,calc(env(safe-area-inset-bottom)+2rem))]">
        {/* Photo, username, why */}
        <section className="flex flex-col items-center pt-8 text-center">
          <button
            type="button"
            onClick={() => props.photosEnabled && photoInput.current?.click()}
            aria-label={hasAvatar ? "Change profile photo" : "Add profile photo"}
            className="relative"
          >
            <Avatar username={props.username} hasAvatar={hasAvatar} size={104} version={photoVersion} />
            {props.photosEnabled && (
              <span className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-ink text-sm text-paper">
                +
              </span>
            )}
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void changePhoto(file);
            }}
          />
          {photoStatus && <p className="mt-3 max-w-xs text-sm text-mute">{photoStatus}</p>}
          <h1 className="font-display mt-4 text-2xl font-bold tracking-tight">{props.username}</h1>
          <button
            type="button"
            onClick={() => setEditSport(true)}
            className="mt-2 text-xs tracking-[0.2em] text-mute uppercase hover:text-paper"
          >
            {sport ?? "Add your sport"}
          </button>
          <button
            type="button"
            onClick={() => setShowWhy(true)}
            className="mt-5 border border-paper/40 px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink"
          >
            Why statement
          </button>
        </section>

        {/* Profile completion */}
        <Completion
          steps={[
            {
              label: "Add a profile photo",
              done: hasAvatar,
              onClick: () => props.photosEnabled && photoInput.current?.click(),
            },
            { label: "Add your sport", done: Boolean(sport), onClick: () => setEditSport(true) },
            { label: "Find your why", done: Boolean(props.why), href: "/?retake=1" },
            {
              label: "Set up your habits",
              done: habitsComplete(props.habitTiers.map((tier) => ({ tier }))),
              href: "/habits",
            },
          ]}
        />

        {/* Habit tracker */}
        <a
          href="/habits"
          className="mt-12 flex items-center justify-between border border-paper/40 px-6 py-4 text-xs tracking-[0.2em] uppercase transition-colors hover:border-paper hover:bg-paper hover:text-ink"
        >
          Habit tracker
          <span aria-hidden>→</span>
        </a>

        {/* Coach videos */}
        <section className="mt-12">
          <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Coach videos</h2>
          {props.videos.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              {props.member ? (
                <>Send your coach a video from the Coach tab and it&rsquo;ll be saved here with the feedback.</>
              ) : (
                <>
                  Video feedback is part of your private coach.{" "}
                  <a href="/coach" className="text-paper/80 underline underline-offset-4">
                    See membership
                  </a>
                </>
              )}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {props.videos.map((v) => (
                <button
                  key={v.mediaId}
                  type="button"
                  onClick={() => setOpenVideo(v)}
                  className="group relative aspect-[3/4] overflow-hidden border border-line bg-black text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${v.mediaId}?poster=1`}
                    alt=""
                    className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-xs text-paper/90">
                    {when(v.at)}
                    {v.note ? ` · ${v.note}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Saved messages */}
        <section className="mt-12">
          <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Saved</h2>
          {favorites.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              Tap ☆ on a message from your coach or the group to keep it here.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {favorites.map((f) => (
                <div key={`${f.source}-${f.messageId}`} className="border border-line px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs tracking-[0.15em] text-mute uppercase">{f.from}</p>
                    <button
                      type="button"
                      onClick={() => unsave(f)}
                      aria-label="Remove from saved"
                      className="px-1 leading-none text-paper"
                    >
                      ★
                    </button>
                  </div>
                  {f.mediaId && <VideoPlayer mediaId={f.mediaId} />}
                  {f.content && <p className="mt-2 leading-relaxed whitespace-pre-wrap text-paper/90">{f.content}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showWhy && (
        <Overlay onClose={() => setShowWhy(false)}>
          <p className="text-xs tracking-[0.2em] text-mute uppercase">Your why</p>
          {props.why ? (
            <p className="font-display mt-6 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
              &ldquo;{props.why}&rdquo;
            </p>
          ) : (
            <p className="mt-6 text-lg text-paper/80">You haven&rsquo;t saved a why yet.</p>
          )}
          <a href="/?retake=1" className="mt-10 inline-block text-sm text-paper/60 underline underline-offset-4">
            {props.why ? "Retake the Seven Whys" : "Find your why"}
          </a>
        </Overlay>
      )}

      {editSport && (
        <Overlay onClose={() => setEditSport(false)}>
          <p className="text-xs tracking-[0.2em] text-mute uppercase">Your sport</p>
          <p className="mt-4 leading-relaxed text-paper/70">
            Your coach uses this to talk your sport&rsquo;s language.
          </p>
          <SportChoices current={sport} onPick={saveSport} className="mt-8" />
          {sportError && <p className="mt-6 text-sm text-mute">{sportError}</p>}
        </Overlay>
      )}

      {openVideo && (
        <Overlay onClose={() => setOpenVideo(null)}>
          <p className="text-xs tracking-[0.2em] text-mute uppercase">{when(openVideo.at)}</p>
          <VideoPlayer mediaId={openVideo.mediaId} />
          {openVideo.note && <p className="mt-3 text-paper/60">{openVideo.note}</p>}
          {openVideo.feedback && (
            <>
              <p className="mt-8 text-xs tracking-[0.2em] text-mute uppercase">Coach&rsquo;s feedback</p>
              <p className="mt-2 text-lg leading-relaxed whitespace-pre-wrap">{openVideo.feedback}</p>
            </>
          )}
        </Overlay>
      )}
    </AppShell>
  );
}

function Completion(props: { steps: { label: string; done: boolean; href?: string; onClick?: () => void }[] }) {
  const left = props.steps.filter((s) => !s.done).length;
  if (left === 0) {
    return <p className="mt-10 text-center text-xs tracking-[0.2em] text-paper/60 uppercase">✓ Profile complete</p>;
  }
  const item = "flex w-full items-center gap-3 py-2.5 text-left text-sm";
  return (
    <section className="mt-12 border border-line px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Complete your profile</h2>
        <span className="text-xs text-paper/60 tabular-nums">
          {props.steps.length - left}/{props.steps.length}
        </span>
      </div>
      <ul className="mt-2">
        {props.steps.map((s) => {
          const body = (
            <>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  s.done ? "border-paper bg-paper text-ink" : "border-paper/40"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span className={s.done ? "text-paper/40 line-through" : "text-paper"}>{s.label}</span>
            </>
          );
          return (
            <li key={s.label}>
              {s.done ? (
                <div className={item}>{body}</div>
              ) : s.href ? (
                <a href={s.href} className={item}>
                  {body}
                </a>
              ) : (
                <button type="button" onClick={s.onClick} className={item}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Overlay(props: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-20 overflow-y-auto bg-ink/95 backdrop-blur-sm">
      <div className="rise mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-20">
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close"
          className="fixed top-5 right-5 px-2 text-2xl leading-none text-paper/70"
        >
          ×
        </button>
        {props.children}
      </div>
    </div>
  );
}
