import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { removeBlobs } from "@/lib/blob";
import {
  approveVideo,
  authorOf,
  banAthlete,
  dismissReports,
  hideWithMedia,
  markCrisisReviewed,
} from "@/lib/group";
import { removeAvatarByMessage } from "@/lib/media";

export const runtime = "nodejs";

// Everything goes by message id so athlete account ids never reach the browser.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), messageId: z.number().int() }),
  z.object({ action: z.literal("dismiss"), messageId: z.number().int() }),
  z.object({ action: z.literal("ban"), messageId: z.number().int() }),
  z.object({ action: z.literal("approve"), messageId: z.number().int() }),
  z.object({ action: z.literal("reject"), messageId: z.number().int() }),
  z.object({ action: z.literal("removePhoto"), messageId: z.number().int() }),
  z.object({ action: z.literal("crisisReviewed"), crisisId: z.number().int() }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const b = parsed.data;
  switch (b.action) {
    case "delete":
      await removeBlobs(await hideWithMedia(b.messageId, "admin"));
      break;
    case "reject":
      await removeBlobs(await hideWithMedia(b.messageId, "rejected"));
      break;
    case "approve":
      await approveVideo(b.messageId);
      break;
    case "dismiss":
      await dismissReports(b.messageId);
      break;
    case "ban": {
      const author = await authorOf(b.messageId);
      if (author) await banAthlete(author);
      break;
    }
    case "removePhoto":
      await removeBlobs([await removeAvatarByMessage(b.messageId)]);
      break;
    case "crisisReviewed":
      await markCrisisReviewed(b.crisisId);
      break;
  }
  return NextResponse.json({ ok: true });
}
