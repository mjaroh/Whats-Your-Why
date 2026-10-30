import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FIRST_QUESTION, type ChatMessage } from "./constants";
import { SAFETY_PROMPT, SYSTEM_PROMPT } from "./prompt";
import type { ConcernCategory } from "./keywords";

// Server only. The key is read from ANTHROPIC_API_KEY by the SDK and never
// leaves this process.
//
// max_tokens matters twice: thinking counts toward it, and the API's
// output-tokens-per-minute rate limit is charged by it up front (adjusted
// once the reply is done). Too low and a call that thinks runs out before it
// answers; too high and every request is turned away by the rate limit.
export const MODEL = "claude-sonnet-5";

/**
 * For short yes/no style calls (moderation, safety screening, check-ins):
 * answer straight away without thinking, so a small limit is plenty.
 */
export const QUICK = { max_tokens: 1024, thinking: { type: "disabled" as const } };

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
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
  sport?: string | null,
): Anthropic.MessageParam[] {
  const kickoff = sport
    ? `[The athlete opened the Seven Whys. Their sport: ${sport}.]`
    : "[The athlete opened the Seven Whys.]";
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: kickoff },
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
  sport?: string | null,
): Promise<WhyOutput> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: toApiMessages(history, questionNumber, allowReask, reminder, sport),
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
export async function classifySafety(history: ChatMessage[]): Promise<ConcernCategory | null> {
  // The full exercise so far gives context: faith, sport and figures of speech
  // read very differently on their own than inside the conversation.
  const transcript = history
    .slice(0, -1)
    .map((m) => (m.role === "assistant" ? `Askesis: ${m.content}` : `Athlete: ${m.content}`))
    .join("\n");
  const latest = history[history.length - 1].content;
  const response = await anthropic().messages.parse({
    model: MODEL,
    ...QUICK,
    system: SAFETY_PROMPT,
    messages: [
      {
        role: "user",
        content:
          `Conversation so far:\n<conversation>\n${transcript}\n</conversation>\n\n` +
          `Athlete's latest message (the one to screen):\n<message>${latest}</message>`,
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
