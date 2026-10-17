import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/account";

export const runtime = "nodejs";

// Deletes the signed-in athlete's account for good (required by the App Store).
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "DELETE") return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await deleteAccount(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("account deletion failed", err);
    return NextResponse.json({ ok: false, error: "Couldn't delete your account. Try again." }, { status: 500 });
  }
}
