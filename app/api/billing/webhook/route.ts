import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe calls this when a subscription starts, renews, fails or is cancelled.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.error("bad webhook signature", err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          await syncSubscription(await stripe().subscriptions.retrieve(session.subscription));
        }
        break;
      }
    }
  } catch (err) {
    console.error("webhook handling failed", event.type, err);
    return new NextResponse("Handler error", { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
