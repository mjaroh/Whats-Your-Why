import { NextResponse } from "next/server";
import { z } from "zod";
import { classifySafety, generateNext, type WhyOutput } from "@/lib/claude";
import {
  FIRST_QUESTION,
  MAX_ANSWER_CHARS,
  MAX_REASKS,
  TOTAL_QUESTIONS,
  type WhyResponse,
} from "@/lib/constants";
import { keywordScreen } from "@/lib/keywords";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { logCrisisEvent } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["assistant", "user"]),
        content: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
      }),
    )
    .min(2)
    .max(2 * (TOTAL_QUESTIONS + MAX_REASKS)),
  /** Answers that counted toward the seven, before the latest one. */
  answered: z.number().int().min(0).max(TOTAL_QUESTIONS - 1),
});

function reply(body: WhyResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const ipHash = hashIp(clientIp(req));
  if (!(await rateLimit(`why:${ipHash}`, 40, 10 * 60_000))) {
    return reply({ type: "error", text: "Too many requests. Take a breath and try again in a few minutes." }, 429);
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({ type: "error", text: "Invalid request." }, 400);
  const { messages, answered } = parsed.data;

  // Shape check: Q1, A1, Q2, A2, ... ending on the athlete's answer.
  const wellFormed =
    messages[0].role === "assistant" &&
    messages[0].content === FIRST_QUESTION &&
    messages.every((m, i) => m.role === (i % 2 === 0 ? "assistant" : "user"));
  const userCount = messages.length / 2;
  const reasksUsed = userCount - 1 - answered;
  if (!wellFormed || !Number.isInteger(userCount) || reasksUsed < 0 || reasksUsed > MAX_REASKS) {
    return reply({ type: "error", text: "Invalid request." }, 400);
  }

  const latest = messages[messages.length - 1].content;
  const previousQuestion = messages[messages.length - 2].content;
  const questionNumber: number | "final" =
    answered + 1 >= TOTAL_QUESTIONS ? "final" : answered + 2;
  const allowReask = reasksUsed < MAX_REASKS;

  // 1. Deterministic screen: stop before any model call.
  const keywordHit = keywordScreen(latest);
  if (keywordHit) {
    await logCrisisEvent({ source: "keyword", category: keywordHit, questionNumber, message: latest, ipHash });
    return reply({ type: "crisis" });
  }

  // 2. Classifier and generation run in parallel; the generated text is only
  //    released if the classifier clears the message.
  const [safety, next] = await Promise.allSettled([
    classifySafety(previousQuestion, latest),
    generateNext(messages, questionNumber, allowReask),
  ]);

  if (safety.status === "rejected") console.error("safety classifier failed", safety.reason);
  if (safety.status === "fulfilled" && safety.value) {
    await logCrisisEvent({ source: "classifier", category: safety.value, questionNumber, message: latest, ipHash });
    return reply({ type: "crisis" });
  }

  const logModelCrisis = () =>
    logCrisisEvent({ source: "model", category: null, questionNumber, message: latest, ipHash });

  // Turns model output into a reply, or null if it doesn't fit this step
  // (wrong type, empty text).
  const accept = (out: WhyOutput): WhyResponse | null => {
    const text = out.text.trim();
    if (!text) return null;
    const isReask = out.type === "question" && out.deflection && allowReask;
    if (questionNumber === "final") {
      if (out.type === "final") return { type: "final", text, answered: TOTAL_QUESTIONS };
      if (isReask) return { type: "question", text, answered };
      return null;
    }
    if (out.type === "question") {
      return { type: "question", text, answered: isReask ? answered : answered + 1 };
    }
    return null;
  };

  let first: WhyOutput | null = null;
  if (next.status === "rejected") console.error("generation failed", next.reason);
  else first = next.value;

  if (first?.type === "crisis") {
    await logModelCrisis();
    return reply({ type: "crisis" });
  }
  const firstReply = first ? accept(first) : null;
  if (firstReply) return reply(firstReply);
  if (first) console.warn("unusable model output; retrying", { questionNumber, type: first.type });

  // One retry with an explicit reminder of what this step needs.
  const reminder =
    questionNumber === "final"
      ? 'Reminder: respond with type "final" and the purpose statement now'
      : `Reminder: respond with type "question" and ask question ${questionNumber}. Do not write the purpose statement yet`;
  try {
    const second = await generateNext(messages, questionNumber, allowReask, reminder);
    if (second.type === "crisis") {
      await logModelCrisis();
      return reply({ type: "crisis" });
    }
    const secondReply = accept(second);
    if (secondReply) return reply(secondReply);
    // Still insists on the purpose statement: show it rather than an error.
    if (second.type === "final" && second.text.trim()) {
      return reply({ type: "final", text: second.text.trim(), answered: TOTAL_QUESTIONS });
    }
    console.error("unusable model output after retry", { questionNumber, type: second.type });
  } catch (err) {
    console.error("generation retry failed", err);
  }
  return reply({ type: "error", text: "Something went wrong. Try sending that again." }, 502);
}
