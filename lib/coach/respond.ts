import "server-only";
import { addMessage, type CoachMessage, type Why } from "../athletes";
import { REPLY_ID_MARKER } from "../constants";
import { streamCoachReply, type AthleteTurn } from "./claude";

const FALLBACK = "I lost my train of thought there. Say that again?";

/**
 * Streams the coach's reply as plain text and saves it. The stream ends with
 * REPLY_ID_MARKER + the saved message id so the app can offer "save" on it.
 */
export function coachReplyResponse(opts: {
  athleteId: string;
  firstName: string | null;
  why: Why | null;
  history: CoachMessage[];
  turn: AthleteTurn;
  userMessageId: number;
}): Response {
  const stream = streamCoachReply({
    firstName: opts.firstName,
    why: opts.why,
    history: opts.history,
    message: opts.turn,
  });

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
        const id = await addMessage(opts.athleteId, "assistant", text.trim());
        controller.enqueue(encoder.encode(REPLY_ID_MARKER + JSON.stringify({ id })));
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
      "X-User-Message-Id": String(opts.userMessageId),
    },
  });
}
