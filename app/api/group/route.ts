import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { classifySafety } from "@/lib/claude";
import {
  approvedSince,
  groupMessages,
  postGroupMessage,
  recentForContext,
  recentlyHidden,
  type GroupMessage,
} from "@/lib/group";
import { GROUP_MAX_CHARS } from "@/lib/constants";
import { keywordScreen } from "@/lib/keywords";
import { BLOCK_REASONS, moderateGroupMessage } from "@/lib/moderation";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { sharesContact } from "@/lib/rules";
import { todaysQuestion } from "@/lib/questionOfDay";
import { logCrisisEvent } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;


function toClient(m: GroupMessage, me: string) {
  return {
    id: m.id,
    username: m.username,
    hasAvatar: m.has_avatar,
    kind: m.kind,
    content: m.content,
    mediaId: m.media_id,
    approved: m.approved,
    mine: m.athlete_id === me,
  };
}

// Poll for new messages: ?after=<last id>&since=<oldest id on screen>
// &approvedAfter=<serverTime from the last poll> (videos approved since then)
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) return NextResponse.json({ error: "Finish setup first." }, { status: 403 });

  await todaysQuestion();
  const url = new URL(req.url);
  const after = Number(url.searchParams.get("after")) || 0;
  const since = Number(url.searchParams.get("since")) || after;
  const approvedParam = url.searchParams.get("approvedAfter");
  const approvedAfter = approvedParam && !Number.isNaN(Date.parse(approvedParam)) ? approvedParam : null;
  const serverTime = new Date();
  const [messages, hidden, approved] = await Promise.all([
    groupMessages({ after, limit: 100, viewer: userId }),
    since ? recentlyHidden(since) : Promise.resolve([]),
    approvedAfter ? approvedSince(new Date(approvedAfter)) : Promise.resolve([]),
  ]);
  return NextResponse.json(
    {
      messages: [...messages, ...approved].map((m) => toClient(m, userId)),
      hidden,
      serverTime: serverTime.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Body = z.object({ content: z.string().trim().min(1).max(GROUP_MAX_CHARS) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) return NextResponse.json({ error: "Finish setup first." }, { status: 403 });
  if (athlete!.banned_at) {
    return NextResponse.json({ type: "blocked", reason: "Your account can't post in the group." }, { status: 403 });
  }
  if (!(await rateLimit(`group:${userId}`, 15, 5 * 60_000))) {
    return NextResponse.json({ type: "blocked", reason: "Slow down a little. Try again in a few minutes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ type: "blocked", reason: `Keep it under ${GROUP_MAX_CHARS} characters.` }, { status: 400 });
  }
  const content = parsed.data.content;

  const crisis = async (source: "keyword" | "classifier", category: string) => {
    await logCrisisEvent({
      source,
      category,
      questionNumber: null,
      message: content,
      ipHash: hashIp(clientIp(req)),
      athleteId: userId,
    });
    return NextResponse.json({ type: "crisis" });
  };

  // 1. Instant checks.
  const keywordHit = keywordScreen(content);
  if (keywordHit) return crisis("keyword", keywordHit);
  if (sharesContact(content)) return NextResponse.json({ type: "blocked", reason: BLOCK_REASONS.contact_info });

  // 2. Crisis classifier and moderation together. Nothing posts unless
  //    moderation clears it (fails closed).
  const context = await recentForContext(8);
  const [safety, verdict] = await Promise.allSettled([
    classifySafety([{ role: "user", content }]),
    moderateGroupMessage(content, context),
  ]);
  if (safety.status === "fulfilled" && safety.value) return crisis("classifier", safety.value);
  if (safety.status === "rejected") console.error("group safety classifier failed", safety.reason);
  if (verdict.status === "rejected") {
    console.error("group moderation failed", verdict.reason);
    return NextResponse.json({ type: "blocked", reason: "Couldn't send that. Try again." }, { status: 502 });
  }
  if (verdict.value) return NextResponse.json({ type: "blocked", reason: BLOCK_REASONS[verdict.value] });

  const message = await postGroupMessage(userId, content);
  return NextResponse.json({ type: "posted", message: toClient(message, userId) });
}
