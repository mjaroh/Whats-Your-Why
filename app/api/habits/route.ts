import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { localDay } from "@/lib/coach/time";
import { cleanSleep, cleanTitle, HABIT_MAX_CHARS, TIERS, todayStatus } from "@/lib/habitRules";
import {
  activeHabits,
  addHabit,
  habitLog,
  refreshDay,
  removeHabit,
  setChecked,
  setSleep,
  TierFullError,
  today,
} from "@/lib/habits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function athleteId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return isSetUp(await getAthlete(userId)) ? userId : null;
}

// Everything the tracker shows, for the athlete's local day.
export async function GET(req: Request) {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const { date, weekday } = localDay(params.get("tz") ?? "UTC");
  // The profile button only needs how today is going.
  if (params.get("summary")) {
    const [habits, day] = await Promise.all([activeHabits(id), today(id, date)]);
    return NextResponse.json(
      { status: todayStatus(habits, day.checked, day.sleep) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const [habits, day, log] = await Promise.all([activeHabits(id), today(id, date), habitLog(id, date)]);
  return NextResponse.json(
    { date, weekday, habits, checked: day.checked, sleep: day.sleep, log },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    tz: z.string(),
    tier: z.enum(TIERS),
    title: z.string().max(HABIT_MAX_CHARS * 2),
  }),
  z.object({ action: z.literal("remove"), tz: z.string(), id: z.number().int().positive() }),
  z.object({ action: z.literal("check"), tz: z.string(), id: z.number().int().positive(), done: z.boolean() }),
  z.object({ action: z.literal("sleep"), tz: z.string(), hours: z.number() }),
]);

export async function POST(req: Request) {
  const id = await athleteId();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.data;
  const { date } = localDay(body.tz);

  switch (body.action) {
    case "add": {
      const title = cleanTitle(body.title);
      if (!title) return NextResponse.json({ error: "Name the habit first." }, { status: 400 });
      try {
        const habit = await addHabit(id, body.tier, title);
        await refreshDay(id, date);
        return NextResponse.json({ habit });
      } catch (err) {
        if (err instanceof TierFullError) {
          return NextResponse.json({ error: "That's the most for this list. Remove one first." }, { status: 400 });
        }
        throw err;
      }
    }
    case "remove":
      await removeHabit(id, body.id);
      await refreshDay(id, date);
      return NextResponse.json({ ok: true });
    case "check":
      return NextResponse.json(await setChecked(id, date, body.id, body.done));
    case "sleep":
      await setSleep(id, date, cleanSleep(body.hours));
      return NextResponse.json({ ok: true });
  }
}
