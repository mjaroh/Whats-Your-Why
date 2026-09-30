# Askesis

A mobile-first web app. A young athlete answers "What's your why?" and six
follow-ups from Claude, and gets back a personal purpose statement.

With a free account (athletes 13+) they join the **group chat**, where the
coach posts a daily group check-in. **Members** ($8/month) also get a
**private coach** that teaches in Michael's voice, built on their why, with its
own daily check-in.

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

- In the free exercise, athlete answers and the purpose statement are **never
  stored**. They live in React state only and are gone on refresh. They're
  saved only if the athlete creates a membership account.
- **One exception:** the single message that triggered a crisis stop is saved in
  `crisis_events` so a human can review it. Nothing else from that
  conversation is saved.
- `signups` stores the parent email and the athlete's first name only.
- IPs are stored only as salted hashes, for rate limiting.
- Rate limits: `/api/why` 40 requests per IP per 10 min, `/api/signup` 5.
  The counters live in Postgres so they hold across serverless instances.

## Accounts, group chat and the paid coach

Accounts switch on once the Clerk keys are set. Until then the site stays
the free Seven Whys plus the parent waitlist.

| | Free account | Member ($8/month) |
|---|---|---|
| Group chat + daily group check-in | ✓ | ✓ |
| Private coach chat + personal daily check-in | | ✓ |

### Setup

1. **Sign-in (Clerk):** in Vercel, open **Integrations → Browse Marketplace →
   Clerk** and connect it to this project. It adds
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. In the Clerk
   dashboard, turn on **First name** under User & Authentication so the coach
   knows the athlete's name.
2. **Payments (Stripe):** create a Stripe account. Add `STRIPE_SECRET_KEY` to
   Vercel (use a test key `sk_test_…` first).
3. **Stripe webhook:** in Stripe, open **Developers → Webhooks → Add endpoint**
   `https://<your-domain>/api/billing/webhook` with events
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated` and `customer.subscription.deleted`. Copy
   its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Customer portal:** in Stripe, open **Settings → Billing → Customer portal**
   and turn it on so members can cancel or update their card.
5. **Database:** `DATABASE_URL` is required for accounts. Tables are
   created automatically.
6. **Admins:** set `ADMIN_EMAILS` to Michael's sign-in email (comma
   separated for more). Admins get **Admin** in the menu.
7. **Group time zone (optional):** `GROUP_TIMEZONE` sets when the group
   check-in rolls over. It defaults to `America/New_York`.
8. Redeploy.

The price ($8/month) lives in `lib/stripe.ts`. No Stripe product setup needed.

### Group chat (`/community`)

- **Names:** athletes post under a username they choose. Rules check its
  format, and Claude rejects usernames that are crude or give away a real full
  name, school, city or birth year.
- **Daily group check-in:** posted by the coach the first time anyone opens the
  group each day. The coach never replies in the group.
- **Screening before posting.** A message goes through, in order:
  1. the crisis keyword screen;
  2. instant blocks for phone numbers, emails, links, @handles and "add my
     snap" style invites;
  3. the crisis classifier and Claude moderation, run together. Moderation
     blocks bullying, sexual content, contact or meetup requests, personal
     details, hate, spam and dangerous advice.
- **When it's blocked or flagged:** blocked messages are never stored, and the
  athlete sees why. A crisis flag shows the crisis screen and logs an alert.
- **If moderation is down:** nothing posts (it fails closed).
- **Reports:** any athlete can report a message. Three reports hide it until
  an admin decides.
- **No private messages** between athletes.
- **Updates:** the chat polls for new messages every 4 seconds while it's open.

### Videos, profile photos and the profile (`/profile`)

Needs a **private** Vercel Blob store connected to the project. In Vercel, open
**Storage → Create → Blob**, choose **Private**, and connect it. Until then the
video and photo buttons are hidden.

- **Videos (up to 90 seconds):** the phone pulls 10 still frames from the video
  and uploads the video straight to private Blob storage. The app reserves the
  storage path first, and an athlete can only upload to their own reserved
  path.
- **Coach videos (members only):** Claude looks at the frames and streams
  feedback in Michael's voice. It only describes what it can see, never
  comments on bodies, and sends new or harder skills back to their coach.
  Limit: 10 a day.
- **Group videos:**
  - Claude screens the frames (and any caption) for anything sexual,
    identifying, dangerous or hateful. A blocked video is deleted right away.
  - Anything that passes waits in **Admin → Videos waiting for approval**. Only
    the author sees it ("Waiting for approval") until an admin approves it.
  - Limit: 5 a day.
- **Watching:** every play goes through `/api/media/[id]`, which checks who is
  asking, then redirects to a private link that expires in 10 minutes.
- **Profile photos:** shown next to group messages. Each photo is resized on
  the phone and checked by Claude before it's saved. Admins can remove a photo
  from the message menu.
- **Profile page:** private to the athlete:
  - their photo and username;
  - a **Why statement** button that opens their why;
  - their coach videos with the feedback on each;
  - messages they saved with ☆ from their coach or the group.

### Admin (`/admin`)

For emails in `ADMIN_EMAILS`:
- **Crisis alerts:** the message and username, with "Mark reviewed".
- **Reported messages:** "It's fine", "Delete" or "Ban author". A ban hides
  all of that athlete's messages and stops them posting.
- **In the chat:** admins can also delete messages or ban authors from each
  message's ••• menu.

### Flow

1. The athlete finishes the Seven Whys and taps "Would you like to continue?".
2. The join screen: they confirm they're 13+, then tap **Join free** and
   create an account (Clerk).
3. `/welcome`: they pick a username. Their why and answers are saved, and they
   land in the group.
4. The **Group | Coach** tabs. For free accounts, Coach shows the paywall
   ($8/month through Stripe Checkout). Members get:
   - their why pinned at the top;
   - one check-in per local day;
   - chat that streams replies.
5. Signed-in athletes opening `/` go straight to the group. The menu has
   "Retake the Seven Whys", "Manage membership" (members), "Admin" (admins)
   and "Sign out".

### Michael's voice

`lib/coach/voice.ts` is a **placeholder**. Replace it with a guide built from
Michael's own content. Everything the coach knows about how he talks and what
he teaches comes from that file. The coaching rules and boundaries live in
`lib/coach/prompt.ts`:
- no medical, nutrition or weight advice;
- it's an AI, not Michael;
- crisis handling.

### Coach safety

Every coach message goes through the same keyword screen and the Claude
classifier, which sees the recent conversation. A flag shows the crisis
screen, doesn't send the message to the coach, and logs it to
`crisis_events` with the athlete's ID.

### Stored data (account holders)

| Table | What |
|---|---|
| `athletes` | Clerk user ID, first name, 13+ confirmation time, Stripe customer and subscription status |
| `whys` | purpose statement and the question/answer pairs |
| `coach_messages` | private coach chat and check-ins (members) |
| `athletes.username`, `banned_at` | group name and ban |
| `group_messages` | group posts and daily group check-ins (hidden, not deleted, when removed) |
| `group_reports` | who reported which message |
| `media` | video uploads: owner, purpose, private storage path, poster frame, status |
| `favorites` | messages an athlete saved to their profile |
| `athletes.avatar_pathname` | private storage path of their profile photo |

## Brand

- Headings use Futura Bold where it's installed (Apple devices). Other devices
  get Jost, a free Futura-style font, then Century Gothic.
- The A-mark in `components/Logo.tsx` is a placeholder SVG. Swap in the real one.
