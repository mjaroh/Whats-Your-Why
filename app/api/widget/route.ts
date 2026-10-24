import { NextResponse } from "next/server";
import { z } from "zod";
import { localDay } from "@/lib/coach/time";
import { setChecked } from "@/lib/habits";
import { awardToken } from "@/lib/tokens";
import { widgetAthlete, widgetDay } from "@/lib/widget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the iPhone widgets with their own key (see lib/widget.ts).

const noStore = { "Cache-Control": "no-store" };
const signedOut = () =>
  NextResponse.json({ error: "Open Askesis to turn widgets back on." }, { status: 401, headers: noStore });

export async function GET(req: Request) {
  const id = await widgetAthlete(req);
  if (!id) return signedOut();
  const { date } = localDay(new URL(req.url).searchParams.get("tz") ?? "UTC");
  return NextResponse.json(await widgetDay(id, date), { headers: noStore });
}

const Body = z.object({ tz: z.string(), id: z.number().int().positive(), done: z.boolean() });

// Checks a must do on or off for today.
export async function POST(req: Request) {
  const id = await widgetAthlete(req);
  if (!id) return signedOut();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { date } = localDay(parsed.data.tz);
  const day = await widgetDay(id, date);
  if (!day.musts.some((h) => h.id === parsed.data.id)) {
    return NextResponse.json({ error: "That habit isn't a must do." }, { status: 400 });
  }
  await setChecked(id, date, parsed.data.id, parsed.data.done);
  const token = await awardToken(id, date);
  return NextResponse.json({ ...(await widgetDay(id, date)), token }, { headers: noStore });
}
