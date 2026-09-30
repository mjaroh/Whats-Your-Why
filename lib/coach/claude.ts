import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "../claude";
import type { CoachMessage, Why } from "../athletes";
import { toApiMessages } from "./history";
import { checkinPrompt, coachSystemPrompt, groupCheckinPrompt } from "./prompt";
import { VOICE_GUIDE } from "./voice";

/** A new athlete turn: plain text, or text plus images (video frames). */
export type AthleteTurn = string | Anthropic.ContentBlockParam[];

export function streamCoachReply(opts: {
  firstName: string | null;
  why: Why | null;
  history: CoachMessage[];
  message: AthleteTurn;
}) {
  let messages: Anthropic.MessageParam[];
  if (typeof opts.message === "string") {
    messages = toApiMessages(opts.history, opts.message);
  } else {
    // Build turns with an empty latest message, then attach the blocks to it.
    messages = toApiMessages(opts.history, "");
    const last = messages[messages.length - 1];
    const carried = typeof last.content === "string" ? last.content.trim() : "";
    last.content = [...(carried ? [{ type: "text" as const, text: carried }] : []), ...opts.message];
  }
  return anthropic().messages.stream({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: coachSystemPrompt(opts.firstName, opts.why),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
    output_config: { effort: "low" },
  });
}

export async function generateCheckin(opts: {
  firstName: string | null;
  why: Why | null;
  weekday: string;
  recentCheckins: string[];
}): Promise<string> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: coachSystemPrompt(opts.firstName, opts.why),
    messages: [
      { role: "user", content: checkinPrompt(opts.firstName, opts.weekday, opts.recentCheckins) },
    ],
    output_config: { effort: "low" },
  });
  if (response.stop_reason === "refusal") throw new Error("check-in refused");
  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("empty check-in");
  return text;
}

/** The group's daily check-in, in Michael's voice but for everyone. */
export async function generateGroupCheckin(weekday: string, recent: string[]): Promise<string> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `You write for Askesis, in the voice of Michael Jaroh.\n\n<voice>\n${VOICE_GUIDE}\n</voice>`,
    messages: [{ role: "user", content: groupCheckinPrompt(weekday, recent) }],
    output_config: { effort: "low" },
  });
  if (response.stop_reason === "refusal") throw new Error("group check-in refused");
  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("empty group check-in");
  return text;
}
