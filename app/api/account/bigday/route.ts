import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAthlete, isSetUp, setBigDay } from "@/lib/athletes";
import { cleanBigDayTitle, isCalendarDate } from "@/lib/bigDay";

export const runtime = "nodejs";

const Body = z.object({ title: z.string().max(200).nullable(), date: z.string().max(10).nullable() });

// Set, change or clear the athlete's big day from their profile.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isSetUp(await getAthlete(userId))) return NextResponse.json({ ok: false }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Couldn't read that." }, { status: 400 });

  if (parsed.data.title === null && parsed.data.date === null) {
    await setBigDay(userId, null, null);
    return NextResponse.json({ ok: true });
  }
  const title = cleanBigDayTitle(parsed.data.title);
  if (!title) return NextResponse.json({ ok: false, error: "Name your big day." }, { status: 400 });
  if (!isCalendarDate(parsed.data.date)) {
    return NextResponse.json({ ok: false, error: "Pick a date." }, { status: 400 });
  }
  await setBigDay(userId, title, parsed.data.date);
  return NextResponse.json({ ok: true, title, date: parsed.data.date });
}
