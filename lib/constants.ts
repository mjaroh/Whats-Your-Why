// Shared between client and server. Nothing secret belongs in this file.

export const FIRST_QUESTION = "What's your why?";
export const TOTAL_QUESTIONS = 7;

export const MAX_ANSWER_CHARS = 1000;
export const GROUP_MAX_CHARS = 500;

// Videos (coach feedback and group posts)
export const VIDEO_MAX_SECONDS = 90;
export const VIDEO_MAX_BYTES = 300 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
/** Still frames pulled from each video for the coach and for moderation. */
export const VIDEO_FRAMES = 10;
/** How many vague answers ("idk") we re-ask before we stop re-asking. */
export const MAX_REASKS = 3;

export type ChatMessage = { role: "assistant" | "user"; content: string };

/** Response contract for POST /api/why. */
export type WhyResponse =
  | { type: "question"; text: string; answered: number }
  | { type: "final"; text: string; answered: number }
  | { type: "crisis" }
  | { type: "error"; text: string };

/** Separates a streamed coach reply from its trailing {"id": n} metadata. */
export const REPLY_ID_MARKER = "\u001e";
