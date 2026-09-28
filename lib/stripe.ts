import "server-only";
import Stripe from "stripe";
import { updateSubscription } from "./athletes";

export const PRICE_CENTS = 800; // $8.00 / month
export const PRICE_LABEL = "$8/month";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function createCheckout(opts: {
  athleteId: string;
  customerId: string | null;
  origin: string;
}) {
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    client_reference_id: opts.athleteId,
    ...(opts.customerId ? { customer: opts.customerId } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS,
          recurring: { interval: "month" },
          product_data: { name: "Askesis membership" },
        },
      },
    ],
    subscription_data: { metadata: { athlete_id: opts.athleteId } },
    success_url: `${opts.origin}/coach?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/coach`,
  });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const end = sub.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

function customerId(c: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof c === "string" ? c : c.id;
}

export async function syncSubscription(sub: Stripe.Subscription) {
  await updateSubscription({
    athleteId: sub.metadata?.athlete_id || undefined,
    customerId: customerId(sub.customer),
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEnd(sub),
  });
}

/**
 * Called on the success redirect so access opens immediately, even if the
 * webhook hasn't arrived yet. Only syncs sessions that belong to this athlete.
 */
export async function syncCheckoutSession(sessionId: string, athleteId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (session.client_reference_id !== athleteId) return;
  const sub = session.subscription;
  if (!sub || typeof sub === "string") return;
  await updateSubscription({
    athleteId,
    customerId: customerId(sub.customer),
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEnd(sub),
  });
}
