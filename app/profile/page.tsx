import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Profile } from "@/components/Profile";
import { isAdmin } from "@/lib/admin";
import { getAthlete, getWhy, isMember, isSetUp } from "@/lib/athletes";
import { blobEnabled } from "@/lib/blob";
import { clerkEnabled } from "@/lib/clerk";
import { coachVideos, listFavorites } from "@/lib/media";

export const dynamic = "force-dynamic";

// The athlete's own space. Only they can see it.
export default async function ProfilePage() {
  if (!clerkEnabled) redirect("/");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const athlete = await getAthlete(userId);
  if (!isSetUp(athlete)) redirect("/welcome");

  const [why, videos, favorites, admin] = await Promise.all([
    getWhy(userId),
    coachVideos(userId),
    listFavorites(userId),
    isAdmin(),
  ]);
  return (
    <Profile
      username={athlete!.username!}
      hasAvatar={Boolean(athlete!.avatar_pathname)}
      member={isMember(athlete)}
      admin={admin}
      photosEnabled={blobEnabled()}
      why={why?.statement ?? null}
      sport={why?.sport ?? null}
      videos={videos.map((v) => ({
        mediaId: v.media_id,
        note: v.note,
        feedback: v.feedback,
        at: v.created_at.toISOString(),
      }))}
      favorites={favorites.map((f) => ({
        source: f.source,
        messageId: f.message_id,
        from: f.from,
        content: f.content,
        mediaId: f.media_id,
      }))}
    />
  );
}
