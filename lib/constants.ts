// Shared between client and server. Nothing secret belongs in this file.

export const FIRST_QUESTION = "What's your why?";
export const TOTAL_QUESTIONS = 7;

export const MAX_ANSWER_CHARS = 1000;
/** How many vague answers ("idk") we re-ask before we stop re-asking. */
export const MAX_REASKS = 3;

export type ChatMessage = { role: "assistant" | "user"; content: string };

/** Response contract for POST /api/why. */
export type WhyResponse =
  | { type: "question"; text: string; answered: number }
  | { type: "final"; text: string; answered: number }
  | { type: "crisis" }
  | { type: "error"; text: string };
