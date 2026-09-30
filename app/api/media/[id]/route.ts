import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { signedReadUrl } from "@/lib/blob";
import { canView, getMedia } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Watching a video (or its ?poster=1 still): checks who is asking, then
// redirects to a link that expires in minutes. The link supports seeking,
// which iPhones need to play video.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse(null, { status: 401 });
  const { id } = await ctx.params;
  const media = await getMedia(Number(id));
  if (!media || media.status === "rejected") return new NextResponse(null, { status: 404 });

  const admin = await isAdmin();
  if (!admin && !isSetUp(await getAthlete(userId))) return new NextResponse(null, { status: 403 });
  if (!(await canView(media, userId, admin))) return new NextResponse(null, { status: 404 });

  const poster = new URL(req.url).searchParams.has("poster");
  const pathname = poster ? media.poster_pathname : media.pathname;
  if (!pathname) return new NextResponse(null, { status: 404 });
  try {
    const url = await signedReadUrl(pathname);
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("signed read failed", err);
    return new NextResponse(null, { status: 502 });
  }
}
