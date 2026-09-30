// Browser-only helpers for sending videos and photos from the phone.
import { uploadPresigned } from "@vercel/blob/client";
import { VIDEO_FRAMES, VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS } from "../constants";

export type Frame = { t: number; data: string };
export type SendStage = { step: "reading" } | { step: "uploading"; percent: number } | { step: "checking" };

function once(el: HTMLVideoElement, event: string, timeoutMs = 20_000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => done(new Error("timeout")), timeoutMs);
    const ok = () => done();
    const bad = () => done(new Error("video error"));
    function done(err?: Error) {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener("error", bad);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, ok);
    el.addEventListener("error", bad);
  });
}

export function videoContentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

/** Pulls evenly spaced still frames (JPEG) from a video file. */
export async function extractFrames(file: File, count = VIDEO_FRAMES, width = 640) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadeddata");
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("no duration");
    if (duration > VIDEO_MAX_SECONDS + 1) {
      throw new UserFacingError(`Videos can be up to ${VIDEO_MAX_SECONDS} seconds. Trim it and try again.`);
    }
    const scale = Math.min(1, width / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    const frames: Frame[] = [];
    for (let i = 0; i < count; i++) {
      const t = duration * (0.05 + (0.9 * i) / Math.max(1, count - 1));
      video.currentTime = t;
      await once(video, "seeked");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ t: Math.round(t * 10) / 10, data: canvas.toDataURL("image/jpeg", 0.7) });
    }
    return { duration, frames };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
  }
}

export class UserFacingError extends Error {}

/**
 * Reads the video, reserves a spot, uploads it straight to storage, and
 * returns what the coach or moderation needs next.
 */
export async function prepareAndUpload(
  file: File,
  purpose: "coach" | "group",
  onStage: (s: SendStage) => void,
): Promise<{ mediaId: number; frames: Frame[] }> {
  if (file.size > VIDEO_MAX_BYTES) {
    throw new UserFacingError("That video file is too big. Trim it or record at a lower quality.");
  }
  onStage({ step: "reading" });
  let extracted;
  try {
    extracted = await extractFrames(file);
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    throw new UserFacingError("Couldn't open that video. Try recording it again with your camera app.");
  }

  const contentType = videoContentType(file);
  const start = await fetch("/api/media/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType, size: file.size, duration: extracted.duration }),
  });
  const reserved = (await start.json().catch(() => ({}))) as { mediaId?: number; pathname?: string; error?: string };
  if (!start.ok || !reserved.mediaId || !reserved.pathname) {
    throw new UserFacingError(reserved.error ?? "Couldn't start the upload.");
  }

  onStage({ step: "uploading", percent: 0 });
  try {
    await uploadPresigned(reserved.pathname, file, {
      access: "private",
      handleUploadUrl: "/api/media/upload",
      contentType,
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onStage({ step: "uploading", percent: Math.round(percentage) }),
    });
  } catch {
    throw new UserFacingError("The upload didn't finish. Check your connection and try again.");
  }
  onStage({ step: "checking" });
  return { mediaId: reserved.mediaId, frames: extracted.frames };
}

export function stageLabel(s: SendStage | null, purpose: "coach" | "group"): string {
  if (!s) return "";
  if (s.step === "reading") return "Preparing your video…";
  if (s.step === "uploading") return `Uploading… ${s.percent}%`;
  return purpose === "coach" ? "Your coach is watching…" : "Checking your video…";
}

/** Square-crops and shrinks a photo to a small JPEG. */
export async function resizePhoto(file: File, size = 512): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
