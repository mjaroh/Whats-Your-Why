import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Community } from "@/components/Community";
import { isAdmin } from "@/lib/admin";
import { getAthlete, isMember, isSetUp } from "@/lib/athletes";
import { clerkEnabled } from "@/lib/clerk";
import { blobEnabled } from "@/lib/blob";
import { groupMessages } from "@/lib/group";
import { favoriteIds } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  if (!clerkEnabled) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) redirect("/welcome");

  const [messages, admin, saved] = await Promise.all([
    groupMessages({ limit: 100, viewer: userId }),
    isAdmin(),
    favoriteIds(userId, "group"),
  ]);
  return (
    <Community
      me={athlete!.username!}
      member={isMember(athlete)}
      admin={admin}
      banned={Boolean(athlete!.banned_at)}
      videoEnabled={blobEnabled()}
      savedIds={saved}
      initialMessages={messages.map((m) => ({
        id: m.id,
        username: m.username,
        hasAvatar: m.has_avatar,
        kind: m.kind,
        content: m.content,
        mediaId: m.media_id,
        approved: m.approved,
        mine: m.athlete_id === userId,
      }))}
    />
  );
}
