// Deterministic first-pass safety screen. High precision on purpose: the
// Claude classifier in lib/safety.ts handles nuance and sports hyperbole.
// Pure module (no server imports) so it can be unit tested.

export type ConcernCategory = "suicide" | "self_harm" | "abuse" | "danger";

const PATTERNS: Array<[ConcernCategory, RegExp]> = [
  ["suicide", /\bsuicid(e|al)\b/],
  ["suicide", /\bkill(ing)?\s+my\s*self\b/],
  ["suicide", /\b(want|wanna|going|gonna)\s+(to\s+)?die\b/],
  ["suicide", /\bend\s+(it\s+all|my\s+life)\b/],
  ["suicide", /\b(better\s+off\s+dead|no\s+reason\s+to\s+live|not\s+worth\s+living)\b/],
  ["suicide", /\bdon'?t\s+want\s+to\s+(be\s+alive|live|be\s+here\s+anymore|exist)\b/],
  ["self_harm", /\bself[\s-]?harm/],
  ["self_harm", /\b(cut|cutting|hurt|hurting|harm|harming|burn|burning)\s+my\s*self\b/],
  ["self_harm", /\bstarv(e|ing)\s+my\s*self\b/],
  ["abuse", /\babus(e|ed|es|ing|ive)\b/],
  ["abuse", /\b(molest|rape|raped|groom(ed|ing))\b/],
  ["abuse", /\btouch(es|ed)\s+me\s+(inappropriately|where|when)\b/],
  [
    "abuse",
    /\b(he|she|they|dad|mom|father|mother|step\s*dad|step\s*mom|stepdad|stepmom|coach|parent|brother|sister|uncle|boyfriend|girlfriend)\s+(hits|hit|beats|beat|chokes|choked|kicks|kicked)\s+me\b/,
  ],
  ["danger", /\b(not|don'?t\s+feel)\s+safe\s+(at\s+home|with\s+my|around)\b/],
  ["danger", /\b(scared|afraid)\s+to\s+go\s+home\b/],
];

export function keywordScreen(text: string): ConcernCategory | null {
  const normalized = text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  for (const [category, pattern] of PATTERNS) {
    if (pattern.test(normalized)) return category;
  }
  return null;
}
