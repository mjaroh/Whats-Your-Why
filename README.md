# Askesis: Seven Whys (v1)

A single-page, mobile-first web app. A young athlete answers "What's your why?"
and six follow-ups from Claude. They get back a personal purpose statement,
and a parent can join the membership waitlist.

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- Claude (`claude-sonnet-5`), called **only** from server routes (`lib/claude.ts`)
- Any Postgres via `DATABASE_URL` (Neon from the Vercel Marketplace, or Supabase)
- Deploys to Vercel as-is

## Run locally

```bash
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY, DATABASE_URL, IP_HASH_SALT
npm install
npm run dev                  # http://localhost:3000
npm test                     # keyword safety-screen tests
```

Tables are created automatically on first use. There are no migrations to run.

## Deploy to Vercel

1. Import the repo in Vercel.
2. Storage → add **Neon Postgres** (Marketplace). It sets `DATABASE_URL`.
   To use Supabase instead, paste its connection string as `DATABASE_URL`.
3. Settings → Environment Variables: add `ANTHROPIC_API_KEY` and `IP_HASH_SALT`
   (any long random string). **Never** prefix these with `NEXT_PUBLIC_`.
4. Deploy.

## How it works

| Screen | Where |
|---|---|
| 1. Landing: question, blinking cursor, type to start | `components/SevenWhys.tsx` → `Landing` |
| 2. Conversation: stacked chat, 7 progress dots | `components/SevenWhys.tsx` → `Conversation` |
| 3. Result: purpose statement in quotes | `components/SevenWhys.tsx` → `Result` |
| 4. Continue: parent email + first name waitlist | `components/Continue.tsx` → `POST /api/signup` |
| Crisis stop: 988 + Crisis Text Line | `components/Crisis.tsx` |

`POST /api/why` gets the full conversation plus the count of answers that
counted so far. The server works out the question number (2–7, or `final`),
sends the system prompt (`lib/prompt.ts`) and history to Claude, and returns
`{ type: "question" | "final" | "crisis", text }`.

- Vague answers ("idk") get re-asked and don't fill a progress dot.
  After 3 re-asks the model is told to move on.
- Structured outputs guarantee the model returns valid JSON.

## Safety

Every answer goes through three checks before a question is shown:

1. **Keyword screen** (`lib/keywords.ts`): high-precision phrases. On a hit,
   the app stops right away, before any model call.
2. **Claude safety classifier** (`lib/claude.ts` → `classifySafety`): runs in
   parallel with question generation. If it flags the message, the generated
   question is thrown away. The prompt tells it to ignore sports hyperbole
   ("kill it at state").
3. **The exercise model itself** can return `type: "crisis"`.

Any of the three stops the exercise, wipes the conversation from browser memory,
and shows the 988 Lifeline and Crisis Text Line. The event is logged to the
`crisis_events` table for human review. Review with:

```sql
SELECT id, created_at, source, category, question_number, message
FROM crisis_events WHERE reviewed_at IS NULL ORDER BY created_at DESC;
-- after review:
UPDATE crisis_events SET reviewed_at = now() WHERE id = ...;
```

Someone needs to own checking this table.

### Data

- Athlete answers and the purpose statement are **never stored**. They live in
  React state only and are gone on refresh.
- **One exception:** the single message that triggered a crisis stop is saved in
  `crisis_events` so a human can review it. Nothing else from that
  conversation is saved.
- `signups` stores the parent email and the athlete's first name only.
- IPs are stored only as salted hashes, for rate limiting.
- Rate limits: `/api/why` 40 requests per IP per 10 min, `/api/signup` 5.
  The counters live in Postgres so they hold across serverless instances.

## Brand

- Headings use Futura Bold where it's installed (Apple devices). Other devices
  get Jost, a free Futura-style font, then Century Gothic.
- The A-mark in `components/Logo.tsx` is a placeholder SVG. Swap in the real one.
