import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addMessage, getAthlete, getWhy, isMember, recentMessages } from "@/lib/athletes";
import { classifySafety } from "@/lib/claude";
import { streamCoachReply } from "@/lib/coach/claude";
import { keywordScreen } from "@/lib/keywords";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { logCrisisEvent } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ message: z.string().trim().min(1).max(2000) });

const FALLBACK = "I lost my train of thought there. Say that again?";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isMember(athlete)) {
    return NextResponse.json({ error: "Your membership isn't active." }, { status: 402 });
  }
  if (!(await rateLimit(`coach:${userId}`, 40, 60 * 60_000))) {
    return NextResponse.json(
      { error: "That's a lot for one hour. Take a break and come back soon." },
      { status: 429 },
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message is empty or too long." }, { status: 400 });
  const message = parsed.data.message;

  const [history, why] = await Promise.all([recentMessages(userId, 40), getWhy(userId)]);

  // Same safety checks as the Seven Whys, run before anything is generated.
  const crisis = async (source: "keyword" | "classifier", category: string) => {
    await logCrisisEvent({
      source,
      category,
      questionNumber: null,
      message,
      ipHash: hashIp(clientIp(req)),
      athleteId: userId,
    });
    return NextResponse.json({ type: "crisis" });
  };
  const keywordHit = keywordScreen(message);
  if (keywordHit) return crisis("keyword", keywordHit);
  try {
    const context = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const flagged = await classifySafety([...context, { role: "user", content: message }]);
    if (flagged) return crisis("classifier", flagged);
  } catch (err) {
    console.error("coach safety classifier failed", err);
  }

  await addMessage(userId, "user", message);
  const stream = streamCoachReply({ firstName: athlete!.first_name, why, history, message });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" || !text.trim()) {
          text = FALLBACK;
          controller.enqueue(encoder.encode(FALLBACK));
        }
      } catch (err) {
        console.error("coach stream failed", err);
        if (!text) {
          text = FALLBACK;
          controller.enqueue(encoder.encode(FALLBACK));
        }
      }
      try {
        await addMessage(userId, "assistant", text.trim());
      } catch (err) {
        console.error("failed to save coach reply", err);
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
