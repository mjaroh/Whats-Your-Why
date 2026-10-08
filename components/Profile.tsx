"use client";

import { useEffect, useRef, useState } from "react";
import { resizePhoto } from "@/lib/client/media";
import { AppNav } from "./AppNav";
import { ProfileMenu } from "./ProfileMenu";
import { AppShell } from "./AppShell";
import { Avatar, VideoPlayer } from "./MediaBits";
import { SportChoices } from "./SportChoices";
import { LA28Countdown } from "./LA28Countdown";
import { isSummerOlympicSport } from "@/lib/olympics";
import { habitsComplete, type Tier, type TodayStatus } from "@/lib/habitRules";

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

  const savedVideos = favorites.filter((f) => f.mediaId);
  const quotes = favorites.filter((f) => !f.mediaId && f.content);

  async function unsave(f: Favorite) {
    setFavorites((list) => list.filter((x) => !(x.source === f.source && x.messageId === f.messageId)));
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: f.source, messageId: f.messageId, on: false }),
    }).catch(() => null);
  }

  return (
    <AppShell header={<AppNav active="profile" me={{ username: props.username, hasAvatar, version: photoVersion }} />}>
      <div className="mx-auto w-full max-w-2xl px-6 pb-[max(4rem,calc(env(safe-area-inset-bottom)+2rem))]">
        {/* Photo, username, why */}
        <section className="relative flex flex-col items-center pt-8 text-center">
          <div className="absolute top-4 right-0">
            <ProfileMenu member={props.member} admin={props.admin} />
          </div>
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
          {isSummerOlympicSport(sport) && <LA28Countdown className="mt-6" />}
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

        {/* Habit tracker: colored by how today is going */}
        <HabitButton />

        {/* Content and Quotes: two tabs you can swipe between */}
        <SwipeTabs
          className="mt-12"
          tabs={[
            {
              label: "Content",
              body: (
                <>
                  {props.videos.length === 0 ? (
                    <p className="text-sm leading-relaxed text-paper/60">
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  {savedVideos.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <p className="text-xs tracking-[0.15em] text-mute uppercase">Saved videos</p>
                      {savedVideos.map((f) => (
                        <div key={`${f.source}-${f.messageId}`} className="border border-line px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs tracking-[0.15em] text-mute uppercase">{f.from}</p>
                            <UnsaveStar onClick={() => unsave(f)} />
                          </div>
                          <VideoPlayer mediaId={f.mediaId!} />
                          {f.content && <p className="mt-2 leading-relaxed text-paper/80">{f.content}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
            {
              label: "Quotes",
              body:
                quotes.length === 0 ? (
                  <p className="text-sm leading-relaxed text-paper/60">
                    Tap ☆ on a message from your coach or the group to keep it here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((f) => (
                      <figure key={`${f.source}-${f.messageId}`} className="border border-line px-5 py-5">
                        <div className="flex items-start justify-between gap-3">
                          <figcaption className="text-xs tracking-[0.15em] text-mute uppercase">{f.from}</figcaption>
                          <UnsaveStar onClick={() => unsave(f)} />
                        </div>
                        <blockquote className="font-display mt-3 text-xl leading-snug font-bold tracking-tight whitespace-pre-wrap text-paper">
                          &ldquo;{f.content}&rdquo;
                        </blockquote>
                      </figure>
                    ))}
                  </div>
                ),
            },
          ]}
        />
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

const HABIT_BUTTON: Record<TodayStatus, { className: string; status: string }> = {
  unset: { className: "border-paper/40 text-paper", status: "" },
  none: { className: "border-status-red bg-status-red text-ink", status: "Sleep not logged yet" },
  started: { className: "border-status-yellow bg-status-yellow text-ink", status: "Must dos in progress" },
  musts: { className: "border-status-green bg-status-green text-ink", status: "All must dos done" },
  done: { className: "border-line text-paper/35", status: "Everything done today" },
};

function HabitButton() {
  const [status, setStatus] = useState<TodayStatus>("unset");
  useEffect(() => {
    const load = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      fetch(`/api/habits?summary=1&tz=${encodeURIComponent(tz)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { status?: TodayStatus } | null) => d?.status && setStatus(d.status))
        .catch(() => {});
    };
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const look = HABIT_BUTTON[status];
  return (
    <a
      href="/habits"
      className={`mt-12 block border px-6 py-4 text-center text-xs tracking-[0.2em] uppercase transition-colors duration-500 ${look.className}`}
    >
      Habit tracker
      {look.status && <span className="sr-only">. {look.status}</span>}
    </a>
  );
}

function UnsaveStar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove from saved" className="px-1 leading-none text-paper">
      ★
    </button>
  );
}

/**
 * Tabs whose panels sit side by side: swipe sideways or tap a tab. Native
 * scroll snapping does the swiping, so it feels like the phone's own.
 */
function SwipeTabs(props: { tabs: { label: string; body: React.ReactNode }[]; className?: string }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  }

  return (
    <section className={props.className}>
      <div role="tablist" className="flex border-b border-line">
        {props.tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => go(i)}
            className={`-mb-px flex-1 border-b py-3 text-xs tracking-[0.2em] uppercase transition-colors ${
              active === i ? "border-paper text-paper" : "border-transparent text-paper/45 hover:text-paper/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== active) setActive(i);
        }}
        className="flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {props.tabs.map((t, i) => (
          <div
            key={t.label}
            role="tabpanel"
            aria-label={t.label}
            aria-hidden={active !== i}
            className="w-full shrink-0 snap-start snap-always pt-6"
          >
            {t.body}
          </div>
        ))}
      </div>
    </section>
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
