import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addCheckin,
  getAthlete,
  getWhy,
  hasCheckin,
  isMember,
  recentMessages,
} from "@/lib/athletes";
import { generateCheckin } from "@/lib/coach/claude";
import { localDay } from "@/lib/coach/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ tz: z.string().max(64) });

// Called when the coach opens. Creates today's check-in once per local day.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!isMember(athlete)) return NextResponse.json({ created: false }, { status: 402 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const { date, weekday } = localDay(parsed.success ? parsed.data.tz : "UTC");
  if (await hasCheckin(userId, date)) return NextResponse.json({ created: false });

  try {
    const [why, history] = await Promise.all([getWhy(userId), recentMessages(userId, 60)]);
    const recentCheckins = history.filter((m) => m.kind === "checkin").slice(-5).map((m) => m.content);
    const text = await generateCheckin({
      firstName: athlete!.first_name,
      why,
      weekday,
      recentCheckins,
    });
    const id = await addCheckin(userId, text, date);
    return NextResponse.json(id ? { created: true, id, text } : { created: false });
  } catch (err) {
    console.error("check-in failed", err);
    return NextResponse.json({ created: false }, { status: 502 });
  }
}
