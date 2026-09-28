import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "../claude";
import type { CoachMessage, Why } from "../athletes";
import { toApiMessages } from "./history";
import { checkinPrompt, coachSystemPrompt } from "./prompt";

export function streamCoachReply(opts: {
  firstName: string | null;
  why: Why | null;
  history: CoachMessage[];
  message: string;
}) {
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
    messages: toApiMessages(opts.history, opts.message),
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
