// Shared by the server and tests (no database or AI here).

/**
 * Used when the coach can't write today's question (the AI service is down,
 * slow or out of credit), so the group never goes a day without one.
 */
export const BACKUP_QUESTIONS = [
  "What's one thing you're working on in training this week?",
  "What's a small win you had in the last few days?",
  "What's one thing you're nervous about right now, and what's one step to face it?",
  "How are you resting and recovering this week?",
  "Who's a teammate who made training better lately, and how?",
  "Where did your why show up for you this week?",
  "What's one skill you want to be better at a month from now?",
  "What did you learn from your last hard practice?",
  "What helps you lock in before a big moment?",
  "What's one habit that's been easier to keep than you expected?",
  "What's something you used to find hard that's easier now?",
  "How do you reset after a bad rep or a bad day?",
  "What's the best piece of advice a coach has given you?",
  "What are you grateful for in your sport right now?",
  "What does a great day of training feel like for you?",
  "What's one thing you'll do today to be one percent better?",
  "How are you sleeping lately, and what helps you wind down?",
  "What's a goal you're quietly chasing right now?",
  "What do you say to yourself when it gets hard?",
  "What part of training do you enjoy most, and why?",
  "When did you last surprise yourself?",
];

/** A backup question that changes each day and skips the recent ones. */
export function backupQuestion(date: string, recent: string[]): string {
  const dayNumber = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  for (let i = 0; i < BACKUP_QUESTIONS.length; i++) {
    const q = BACKUP_QUESTIONS[(dayNumber + i) % BACKUP_QUESTIONS.length];
    if (!recent.includes(q)) return q;
  }
  return BACKUP_QUESTIONS[dayNumber % BACKUP_QUESTIONS.length];
}
