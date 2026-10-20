import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAthlete, isMember, isSetUp } from "@/lib/athletes";
import { isPlanId } from "@/lib/plans";
import { createCheckout, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "Membership isn't open yet." }, { status: 503 });
  }
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) {
    return NextResponse.json({ error: "Finish setting up your account first." }, { status: 400 });
  }
  if (isMember(athlete)) return NextResponse.json({ url: "/coach" });
  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const plan = isPlanId(body.plan) ? body.plan : "month";

  try {
    const url = await createCheckout({
      athleteId: userId,
      customerId: athlete!.stripe_customer_id,
      origin: new URL(req.url).origin,
      plan,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("checkout failed", err);
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 502 });
  }
}
