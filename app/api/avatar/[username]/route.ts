import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { streamPrivate } from "@/lib/blob";
import { avatarForUsername } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A group member's profile photo, for signed-in athletes only. Sent straight
// from here (photos are small), so there's no signed link to go wrong.
export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse(null, { status: 401 });
  const { username } = await ctx.params;
  const pathname = await avatarForUsername(decodeURIComponent(username));
  if (!pathname) return new NextResponse(null, { status: 404 });
  try {
    return (await streamPrivate(pathname)) ?? new NextResponse(null, { status: 404 });
  } catch (err) {
    console.error("avatar read failed", pathname, err);
    return new NextResponse(null, { status: 502 });
  }
}
