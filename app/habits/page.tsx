import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HabitTracker } from "@/components/HabitTracker";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { clerkEnabled } from "@/lib/clerk";

export const dynamic = "force-dynamic";

// The habit tracker: today's checklist and the log. Private to the athlete.
export default async function HabitsPage() {
  if (!clerkEnabled) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) redirect("/welcome");
  return <HabitTracker nav={{ username: athlete!.username!, hasAvatar: Boolean(athlete!.avatar_pathname) }} />;
}
