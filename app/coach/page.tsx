import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Coach } from "@/components/Coach";
import { Paywall } from "@/components/Paywall";
import { isAdmin } from "@/lib/admin";
import { getAthlete, getWhy, isMember, isSetUp, recentMessages } from "@/lib/athletes";
import { clerkEnabled } from "@/lib/clerk";
import { PRICE_LABEL, stripeEnabled, syncCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  if (!clerkEnabled) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) redirect("/welcome");

  // Back from Stripe Checkout: open access right away instead of waiting on the webhook.
  const { checkout } = await searchParams;
  if (checkout && !isMember(athlete) && stripeEnabled()) {
    await syncCheckoutSession(checkout, userId).catch((err) =>
      console.error("checkout sync failed", err),
    );
    athlete = await getAthlete(userId);
  }

  const [why, admin] = await Promise.all([getWhy(userId), isAdmin()]);
  if (!isMember(athlete)) {
    return (
      <Paywall
        statement={why?.statement ?? null}
        price={PRICE_LABEL}
        open={stripeEnabled()}
        admin={admin}
      />
    );
  }

  const messages = await recentMessages(userId, 60);
  return (
    <Coach
      firstName={athlete!.first_name}
      admin={admin}
      statement={why?.statement ?? null}
      initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content, kind: m.kind }))}
    />
  );
}
