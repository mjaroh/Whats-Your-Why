import type Anthropic from "@anthropic-ai/sdk";

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "checkin";
  media_id?: number | null;
};

/** How a stored message reads to the model (past videos appear as a note, not frames). */
function asText(m: StoredMessage): string {
  if (m.kind === "checkin") return `[Daily check-in] ${m.content}`;
  if (m.media_id) return m.content ? `[Sent a video] ${m.content}` : "[Sent a video]";
  return m.content;
}

/**
 * Stored history → API turns. The API needs the first turn to be the user's
 * and roles to alternate, so a kickoff turn is added when a check-in comes
 * first and back-to-back turns from the same side are merged.
 */
export function toApiMessages(history: StoredMessage[], latest: string): Anthropic.MessageParam[] {
  const turns: { role: "user" | "assistant"; text: string }[] = [];
  const push = (role: "user" | "assistant", text: string) => {
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += `\n\n${text}`;
    else turns.push({ role, text });
  };
  for (const m of history) {
    push(m.role, asText(m));
  }
  push("user", latest);
  if (turns[0].role === "assistant") turns.unshift({ role: "user", text: "[Athlete opened the coach.]" });
  return turns.map((t) => ({ role: t.role, content: t.text }));
}

/** Drops labels like "[Daily check-in]" the model sometimes copies from history. */
export function stripTags(text: string): string {
  return text.replace(/^(\s*\[[^\]\n]{1,40}\]\s*)+/, "").trim();
}
