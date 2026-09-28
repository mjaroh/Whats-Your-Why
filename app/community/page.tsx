import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Community } from "@/components/Community";
import { isAdmin } from "@/lib/admin";
import { getAthlete, isMember, isSetUp } from "@/lib/athletes";
import { clerkEnabled } from "@/lib/clerk";
import { groupMessages } from "@/lib/group";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  if (!clerkEnabled) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) redirect("/welcome");

  const [messages, admin] = await Promise.all([groupMessages({ limit: 100 }), isAdmin()]);
  return (
    <Community
      me={athlete!.username!}
      member={isMember(athlete)}
      admin={admin}
      banned={Boolean(athlete!.banned_at)}
      initialMessages={messages.map((m) => ({
        id: m.id,
        username: m.username,
        kind: m.kind,
        content: m.content,
        mine: m.athlete_id === userId,
      }))}
    />
  );
}
