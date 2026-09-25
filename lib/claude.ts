import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FIRST_QUESTION, type ChatMessage } from "./constants";
import { SAFETY_PROMPT, SYSTEM_PROMPT } from "./prompt";
import type { ConcernCategory } from "./keywords";

// Server only. The key is read from ANTHROPIC_API_KEY by the SDK and never
// leaves this process.
const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ timeout: 30_000, maxRetries: 2 });
  return client;
}

const WhyOutput = z.object({
  type: z.enum(["question", "final", "crisis"]),
  text: z.string(),
  deflection: z.boolean(),
});
export type WhyOutput = z.infer<typeof WhyOutput>;

const SafetyOutput = z.object({
  concern: z.boolean(),
  category: z.enum(["none", "suicide", "self_harm", "abuse", "danger"]),
});

/**
 * The exercise opens with an assistant question, but the API conversation
 * must start with a user turn, so a short kickoff turn is prepended.
 */
function toApiMessages(
  history: ChatMessage[],
  questionNumber: number | "final",
  allowReask: boolean,
  reminder?: string,
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "[The athlete opened the Seven Whys.]" },
    { role: "assistant", content: FIRST_QUESTION },
  ];
  history.forEach((m, i) => {
    const isLast = i === history.length - 1;
    if (!isLast) {
      messages.push({ role: m.role, content: m.content });
      return;
    }
    const note =
      `[Question number: ${questionNumber}` +
      (allowReask ? "" : ". Re-asking is no longer allowed") +
      (reminder ? `. ${reminder}` : "") +
      "]";
    messages.push({
      role: "user",
      content: [
        { type: "text", text: m.content },
        { type: "text", text: note },
      ],
    });
  });
  return messages;
}

export async function generateNext(
  history: ChatMessage[],
  questionNumber: number | "final",
  allowReask: boolean,
  reminder?: string,
): Promise<WhyOutput> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: toApiMessages(history, questionNumber, allowReask, reminder),
    output_config: { effort: "low", format: zodOutputFormat(WhyOutput) },
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`model refusal: ${response.stop_details?.category ?? "unknown"}`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("model output hit max_tokens");
  if (!response.parsed_output) throw new Error("unparseable model output");
  return response.parsed_output;
}

/** Returns a concern category, or null if the message looks safe. */
export async function classifySafety(
  previousQuestion: string,
  answer: string,
): Promise<ConcernCategory | null> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: SAFETY_PROMPT,
    messages: [
      {
        role: "user",
        content:
          `Question the athlete was asked:\n<question>${previousQuestion}</question>\n\n` +
          `Athlete's latest message:\n<message>${answer}</message>`,
      },
    ],
    output_config: { effort: "low", format: zodOutputFormat(SafetyOutput) },
  });
  if (response.stop_reason === "refusal") return "danger"; // fail safe
  const out = response.parsed_output;
  if (!out) throw new Error("unparseable safety output");
  if (!out.concern) return null;
  return out.category === "none" ? "danger" : out.category;
}
