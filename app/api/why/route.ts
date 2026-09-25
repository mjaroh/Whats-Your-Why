import { NextResponse } from "next/server";
import { z } from "zod";
import { classifySafety, generateNext } from "@/lib/claude";
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

  if (next.status === "rejected") {
    console.error("generation failed", next.reason);
    return reply({ type: "error", text: "Something went wrong. Try sending that again." }, 502);
  }
  const out = next.value;

  if (out.type === "crisis") {
    await logCrisisEvent({ source: "model", category: null, questionNumber, message: latest, ipHash });
    return reply({ type: "crisis" });
  }

  const isReask = out.type === "question" && out.deflection && allowReask;
  const text = out.text.trim();
  if (!text) return reply({ type: "error", text: "Something went wrong. Try sending that again." }, 502);

  if (questionNumber === "final") {
    if (out.type === "final") return reply({ type: "final", text, answered: TOTAL_QUESTIONS });
    if (isReask) return reply({ type: "question", text, answered });
  } else if (out.type === "question") {
    return reply({ type: "question", text, answered: isReask ? answered : answered + 1 });
  }

  console.error("unexpected model output type", { questionNumber, type: out.type });
  return reply({ type: "error", text: "Something went wrong. Try sending that again." }, 502);
}
