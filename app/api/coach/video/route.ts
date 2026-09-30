import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addMessage, getAthlete, getWhy, isMember, recentMessages } from "@/lib/athletes";
import { classifySafety } from "@/lib/claude";
import { coachReplyResponse } from "@/lib/coach/respond";
import { keywordScreen } from "@/lib/keywords";
import { clientIp, hashIp } from "@/lib/request";
import { logCrisisEvent } from "@/lib/safety";
import { decodeFrames, finishVideo, FramesBody, frameBlocks, uploadedVideo } from "@/lib/videoUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  mediaId: z.number().int().positive(),
  frames: FramesBody,
  note: z.string().trim().max(2000).default(""),
});

// Step 3 for coach videos: the upload is done; the coach looks at the frames
// and streams its feedback.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isMember(athlete)) return NextResponse.json({ error: "Your membership isn't active." }, { status: 402 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const frames = parsed.success ? decodeFrames(parsed.data.frames) : null;
  if (!parsed.success || !frames) return NextResponse.json({ error: "Couldn't read that video." }, { status: 400 });
  const { mediaId, note } = parsed.data;

  const media = await uploadedVideo(mediaId, userId, "coach");
  if (!media) return NextResponse.json({ error: "The upload didn't finish. Try again." }, { status: 400 });

  const [history, why] = await Promise.all([recentMessages(userId, 40), getWhy(userId)]);

  // The note goes through the same safety checks as any coach message.
  if (note) {
    const hit =
      keywordScreen(note) ??
      (await classifySafety([
        ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: note },
      ]).catch(() => null));
    if (hit) {
      await logCrisisEvent({
        source: "classifier",
        category: hit,
        questionNumber: null,
        message: note,
        ipHash: hashIp(clientIp(req)),
        athleteId: userId,
      });
      return NextResponse.json({ type: "crisis" });
    }
  }

  await finishVideo(media, frames);
  const userMessageId = await addMessage(userId, "user", note, "chat", media.id);
  const seconds = media.duration_s ? `${Math.round(media.duration_s)}s ` : "";
  const turn = [
    { type: "text" as const, text: `[The athlete sent a ${seconds}video. Still frames in order:]` },
    ...frameBlocks(frames),
    { type: "text" as const, text: note || "What do you see? Give me feedback." },
  ];
  return coachReplyResponse({
    athleteId: userId,
    firstName: athlete!.first_name,
    why,
    history,
    turn,
    userMessageId,
  });
}
