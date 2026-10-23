import { habitsComplete, type Habit } from "./habitRules.ts";

// Askesis tokens. An athlete earns one for a day when every habit on their
// tracker is checked off and they slept between 9½ and 10 hours the night
// before. One token per day at most.

export const TOKEN_SLEEP_MIN = 9.5;
export const TOKEN_SLEEP_MAX = 10;

export function earnsToken(habits: Habit[], checked: number[], sleep: number | null): boolean {
  if (sleep === null || sleep < TOKEN_SLEEP_MIN || sleep > TOKEN_SLEEP_MAX) return false;
  if (!habitsComplete(habits)) return false;
  const done = new Set(checked);
  return habits.every((h) => done.has(h.id));
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
};
