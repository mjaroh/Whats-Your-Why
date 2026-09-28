import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAthlete } from "@/lib/athletes";
import { stripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe's hosted page for changing card, viewing receipts or cancelling.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const athlete = await getAthlete(userId);
  if (!stripeEnabled() || !athlete?.stripe_customer_id) {
    return NextResponse.json({ error: "No membership to manage yet." }, { status: 400 });
  }
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: athlete.stripe_customer_id,
      return_url: `${new URL(req.url).origin}/coach`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("billing portal failed", err);
    return NextResponse.json({ error: "Couldn't open billing. Try again." }, { status: 502 });
  }
}
