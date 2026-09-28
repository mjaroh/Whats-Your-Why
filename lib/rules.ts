// Deterministic group-chat rules. Pure module (no server imports) so it can
// be unit tested. Claude moderation (lib/moderation.ts) handles everything
// that needs judgment.

const CONTACT_PATTERNS: RegExp[] = [
  /(?:\d[\s().-]*){7,}/, // phone numbers
  /[\w.+-]+@[\w-]+\.[\w.]+/, // emails
  /\bhttps?:\/\/|\bwww\.|\b[\w-]+\.(?:com|net|org|io|me|gg|app|ly|co|us|tv)\b/i, // links
  /(?:^|\s)@[a-z0-9_.]{2,}/i, // @handles
  /\b(?:snap(?:chat)?|sc|insta(?:gram)?|ig|tik\s?tok|discord|whats\s?app|telegram|kik|facebook|fb|twitter|x\.com|venmo|cash\s?app)\b\s*[:=@-]?\s*[\w.]{2,}/i,
  /\b(?:dm|text|call|message|add|follow)\s+me\b/i,
];

/** True if the text shares or asks for off-app contact. */
export function sharesContact(text: string): boolean {
  return CONTACT_PATTERNS.some((p) => p.test(text));
}

const RESERVED = ["askesis", "admin", "moderator", "mod", "coach", "michael", "michaeljaroh", "staff", "official"];

/** Returns an error message, or null if the username's format is fine. */
export function usernameProblem(raw: string): string | null {
  const name = raw.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
    return "Use 3–20 letters, numbers or underscores.";
  }
  if (RESERVED.some((r) => name.toLowerCase().replace(/_/g, "").includes(r))) {
    return "That name is reserved. Pick another.";
  }
  if (/\d{4,}/.test(name) || sharesContact(name)) {
    return "Leave numbers like years, phone numbers or handles out of your username.";
  }
  return null;
}
