import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { removeBlobs } from "./blob";
import { clerkEnabled } from "./clerk";
import { db } from "./db";
import { stripe, stripeEnabled } from "./stripe";

/**
 * Deletes an athlete's account and everything in it: their why, coach
 * chat, group posts, habits, videos, photo and favorites. Cancels an
 * active membership first so they aren't billed again, then removes the
 * sign-in itself. Safety logs keep the event but lose the link to them.
 */
export async function deleteAccount(athleteId: string) {
  const sql = await db();
  const [athlete] = await sql<
    { subscription_id: string | null; subscription_status: string | null; avatar_pathname: string | null }[]
  >`
    SELECT subscription_id, subscription_status, avatar_pathname FROM athletes WHERE id = ${athleteId}`;
  const files = await sql<{ pathname: string; poster_pathname: string | null }[]>`
    SELECT pathname, poster_pathname FROM media WHERE athlete_id = ${athleteId}`;

  const live = ["active", "trialing", "past_due", "unpaid"];
  if (athlete?.subscription_id && live.includes(athlete.subscription_status ?? "") && stripeEnabled()) {
    await stripe().subscriptions.cancel(athlete.subscription_id);
  }

  await sql.begin(async (tx) => {
    await tx`UPDATE crisis_events SET athlete_id = NULL WHERE athlete_id = ${athleteId}`;
    await tx`DELETE FROM athletes WHERE id = ${athleteId}`; // everything else cascades
  });

  await removeBlobs([athlete?.avatar_pathname, ...files.flatMap((f) => [f.pathname, f.poster_pathname])]);
  if (clerkEnabled) await (await clerkClient()).users.deleteUser(athleteId);
}
