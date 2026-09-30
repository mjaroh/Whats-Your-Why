import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { removeBlobs } from "@/lib/blob";
import { classifySafety } from "@/lib/claude";
import { GROUP_MAX_CHARS } from "@/lib/constants";
import { postGroupMessage, recentForContext } from "@/lib/group";
import { keywordScreen } from "@/lib/keywords";
import { markRejected } from "@/lib/media";
import { BLOCK_REASONS, moderateGroupMessage, moderateVideoFrames, VIDEO_BLOCK_REASONS } from "@/lib/moderation";
import { clientIp, hashIp } from "@/lib/request";
import { sharesContact } from "@/lib/rules";
import { logCrisisEvent } from "@/lib/safety";
import { decodeFrames, finishVideo, FramesBody, uploadedVideo } from "@/lib/videoUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  mediaId: z.number().int().positive(),
  frames: FramesBody,
  caption: z.string().trim().max(GROUP_MAX_CHARS).default(""),
});

// Step 3 for group videos: Claude screens the frames (and caption), then the
// post waits for an admin to approve it. Blocked videos are deleted.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) return NextResponse.json({ error: "Finish setup first." }, { status: 403 });
  if (athlete!.banned_at) {
    return NextResponse.json({ type: "blocked", reason: "Your account can't post in the group." }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const frames = parsed.success ? decodeFrames(parsed.data.frames) : null;
  if (!parsed.success || !frames) return NextResponse.json({ error: "Couldn't read that video." }, { status: 400 });
  const { mediaId, caption } = parsed.data;

  const media = await uploadedVideo(mediaId, userId, "group");
  if (!media) return NextResponse.json({ error: "The upload didn't finish. Try again." }, { status: 400 });

  const reject = async (body: object) => {
    await markRejected(media.id);
    await removeBlobs([media.pathname]);
    return NextResponse.json(body);
  };
  const crisis = async (category: string) => {
    await logCrisisEvent({
      source: "classifier",
      category,
      questionNumber: null,
      message: caption || "(video)",
      ipHash: hashIp(clientIp(req)),
      athleteId: userId,
    });
    return reject({ type: "crisis" });
  };

  if (caption) {
    const hit = keywordScreen(caption);
    if (hit) return crisis(hit);
    if (sharesContact(caption)) return reject({ type: "blocked", reason: BLOCK_REASONS.contact_info });
  }

  const context = caption ? await recentForContext(8) : [];
  const [videoCheck, captionCheck, safety] = await Promise.allSettled([
    moderateVideoFrames(frames),
    caption ? moderateGroupMessage(caption, context) : Promise.resolve(null),
    caption ? classifySafety([{ role: "user", content: caption }]) : Promise.resolve(null),
  ]);
  if (safety.status === "fulfilled" && safety.value) return crisis(safety.value);
  if (videoCheck.status === "rejected" || captionCheck.status === "rejected") {
    console.error("group video moderation failed", videoCheck, captionCheck);
    return reject({ type: "blocked", reason: "Couldn't check that video. Try again." });
  }
  if (videoCheck.value === "self_harm") return crisis("self_harm");
  if (videoCheck.value) return reject({ type: "blocked", reason: VIDEO_BLOCK_REASONS[videoCheck.value] });
  if (captionCheck.value) return reject({ type: "blocked", reason: BLOCK_REASONS[captionCheck.value] });

  await finishVideo(media, frames);
  const message = await postGroupMessage(userId, caption, media.id);
  return NextResponse.json({
    type: "pending",
    message: {
      id: message.id,
      username: message.username,
      hasAvatar: message.has_avatar,
      kind: message.kind,
      content: message.content,
      mediaId: message.media_id,
      approved: false,
      mine: true,
    },
  });
}
