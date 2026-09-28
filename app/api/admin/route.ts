import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { authorOf, banAthlete, deleteMessage, dismissReports, markCrisisReviewed } from "@/lib/group";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), messageId: z.number().int() }),
  z.object({ action: z.literal("dismiss"), messageId: z.number().int() }),
  // Ban by message so athlete account ids never reach the browser.
  z.object({ action: z.literal("ban"), messageId: z.number().int() }),
  z.object({ action: z.literal("crisisReviewed"), crisisId: z.number().int() }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const b = parsed.data;
  if (b.action === "delete") await deleteMessage(b.messageId);
  if (b.action === "dismiss") await dismissReports(b.messageId);
  if (b.action === "ban") {
    const author = await authorOf(b.messageId);
    if (author) await banAthlete(author);
  }
  if (b.action === "crisisReviewed") await markCrisisReviewed(b.crisisId);
  return NextResponse.json({ ok: true });
}
