"use client";

import { useState } from "react";
import { VideoPlayer } from "./MediaBits";

type Report = { id: number; username: string | null; content: string; reports: number; hidden: boolean; created_at: string };
type PendingVideo = { id: number; media_id: number; username: string | null; content: string; created_at: string };
type CrisisItem = { id: number; created_at: string; source: string; category: string | null; message: string; username: string | null };

async function post(body: object) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return Boolean(res?.ok);
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function AdminPanel(props: { reports: Report[]; crises: CrisisItem[]; videos: PendingVideo[] }) {
  const [reports, setReports] = useState(props.reports);
  const [videos, setVideos] = useState(props.videos);
  const [crises, setCrises] = useState(props.crises);

  async function resolve(r: Report, action: "delete" | "dismiss" | "ban") {
    if (action === "ban" && !confirm(`Ban ${r.username ?? "this athlete"} and remove all their messages?`)) return;
    if (await post({ action, messageId: r.id })) setReports((x) => x.filter((y) => y.id !== r.id));
  }
  async function decide(v: PendingVideo, action: "approve" | "reject") {
    if (await post({ action, messageId: v.id })) setVideos((x) => x.filter((y) => y.id !== v.id));
  }
  async function reviewed(c: CrisisItem) {
    if (await post({ action: "crisisReviewed", crisisId: c.id })) setCrises((x) => x.filter((y) => y.id !== c.id));
  }

  const btn = "border border-line px-3 py-2 text-xs tracking-[0.1em] uppercase hover:border-paper";
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-6 py-10">
      <a href="/community" className="text-sm text-paper/60">← Back to the group</a>
      <h1 className="font-display mt-6 text-3xl font-bold tracking-tight">Admin</h1>

      <section className="mt-10">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Videos waiting for approval ({videos.length})</h2>
        <p className="mt-2 text-sm text-mute">
          Already screened by AI. Watch each one: approve training and competition videos; reject anything
          that shows too much, identifies where someone lives or trains, or isn&rsquo;t right for kids.
        </p>
        <div className="mt-4 space-y-3">
          {videos.length === 0 && <p className="text-sm text-paper/50">Nothing waiting.</p>}
          {videos.map((v) => (
            <div key={v.id} className="border border-line p-4">
              <p className="text-xs text-mute">
                {v.username} · {when(v.created_at)}
              </p>
              <VideoPlayer mediaId={v.media_id} />
              {v.content && <p className="mt-2 whitespace-pre-wrap">{v.content}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => decide(v, "approve")}>Approve</button>
                <button type="button" className={btn} onClick={() => decide(v, "reject")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Crisis alerts ({crises.length})</h2>
        <p className="mt-2 text-sm text-mute">
          An athlete saw the crisis screen. Check in on them through the right channel, then mark reviewed.
        </p>
        <div className="mt-4 space-y-3">
          {crises.length === 0 && <p className="text-sm text-paper/50">Nothing to review.</p>}
          {crises.map((c) => (
            <div key={c.id} className="border border-line p-4">
              <p className="text-xs text-mute">
                {when(c.created_at)} · {c.username ?? "not signed in (Seven Whys)"} · {c.category ?? c.source}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{c.message}</p>
              <button type="button" className={`${btn} mt-3`} onClick={() => reviewed(c)}>Mark reviewed</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs tracking-[0.2em] text-mute uppercase">Reported messages ({reports.length})</h2>
        <div className="mt-4 space-y-3">
          {reports.length === 0 && <p className="text-sm text-paper/50">Nothing reported.</p>}
          {reports.map((r) => (
            <div key={r.id} className="border border-line p-4">
              <p className="text-xs text-mute">
                {r.username} · {when(r.created_at)} · {r.reports} report{r.reports === 1 ? "" : "s"}
                {r.hidden ? " · hidden until you decide" : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{r.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => resolve(r, "dismiss")}>It&rsquo;s fine</button>
                <button type="button" className={btn} onClick={() => resolve(r, "delete")}>Delete</button>
                <button type="button" className={btn} onClick={() => resolve(r, "ban")}>Ban author</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
