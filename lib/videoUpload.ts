import "server-only";
import { z } from "zod";
import { blobExists, jpegFromDataUrl, putPrivateImage } from "./blob";
import { VIDEO_FRAMES } from "./constants";
import { getMedia, markReady, type Media, type MediaPurpose } from "./media";
import type { JpegFrame } from "./moderation";

export const FramesBody = z
  .array(z.object({ t: z.number().min(0).max(600), data: z.string().max(700_000) }))
  .min(3)
  .max(VIDEO_FRAMES);

export function decodeFrames(frames: z.infer<typeof FramesBody>): JpegFrame[] | null {
  const out: JpegFrame[] = [];
  for (const f of frames) {
    const data = jpegFromDataUrl(f.data, 500_000);
    if (!data) return null;
    out.push({ t: f.t, data });
  }
  return out;
}

/** The video this athlete just uploaded for this purpose, if it really arrived. */
export async function uploadedVideo(
  mediaId: number,
  athleteId: string,
  purpose: MediaPurpose,
): Promise<Media | null> {
  const media = await getMedia(mediaId);
  if (!media || media.athlete_id !== athleteId || media.purpose !== purpose) return null;
  if (media.status !== "uploading") return null;
  if (!(await blobExists(media.pathname))) return null;
  return media;
}

/** Saves a poster frame and marks the video ready to watch. */
export async function finishVideo(media: Media, frames: JpegFrame[]) {
  const poster = frames[Math.min(1, frames.length - 1)].data;
  const posterPathname = `posters/${media.athlete_id}/${media.id}.jpg`;
  await putPrivateImage(posterPathname, poster);
  await markReady(media.id, posterPathname);
}

export function frameBlocks(frames: JpegFrame[]) {
  return frames.flatMap((f) => [
    { type: "text" as const, text: `Frame at ${f.t.toFixed(1)}s` },
    {
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: f.data.toString("base64") },
    },
  ]);
}
