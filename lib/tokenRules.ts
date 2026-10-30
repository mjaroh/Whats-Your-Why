import { habitsComplete, type Habit } from "./habitRules.ts";

// Askesis tokens. An athlete earns one for a day when every must do is
// checked off, plus at least one want to do and one wish to do, and they
// slept at least 9½ hours the night before. One token per day at most.

export const TOKEN_SLEEP_MIN = 9.5;

export function earnsToken(habits: Habit[], checked: number[], sleep: number | null): boolean {
  if (sleep === null || sleep < TOKEN_SLEEP_MIN) return false;
  if (!habitsComplete(habits)) return false;
  const done = (h: Habit) => checked.includes(h.id);
  const tier = (t: Habit["tier"]) => habits.filter((h) => h.tier === t);
  return tier("must").every(done) && tier("want").some(done) && tier("wish").some(done);
}

export type TokenMessage = {
  /** The words shown when the token is opened. */
  quote: string;
  source: string;
  link?: { label: string; href: string };
};

/**
 * The message behind each token, by its number (the first token earned is 1).
 * Tokens past the end of this list don't have a message yet.
 */
export const TOKEN_MESSAGES: Record<number, TokenMessage> = {
  1: {
    // New King James Version, the English text of the Orthodox Study Bible.
    quote:
      "Do you not know that those who run in a race all run, but one receives the prize? Run in such a way that you may obtain it.",
    source: "Saint Paul · 1 Corinthians 9:24",
    link: {
      label: "Steven Kostoff",
      href: "https://www.oca.org/reflections/fr.-steven-kostoff/athletes-for-christ",
    },
  },
  2: {
    quote: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.",
    source: "Saint Paul · 2 Timothy 1:7",
  },
};
