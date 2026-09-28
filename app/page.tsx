import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SevenWhys } from "@/components/SevenWhys";
import { getAthlete, isSetUp } from "@/lib/athletes";
import { clerkEnabled } from "@/lib/clerk";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  let signedIn = false;
  if (clerkEnabled) {
    const { userId } = await auth();
    signedIn = Boolean(userId);
    // Account holders open straight into the group, unless they chose to retake.
    const { retake } = await searchParams;
    if (userId && !retake && isSetUp(await getAthlete(userId).catch(() => null))) {
      redirect("/community");
    }
  }
  return (
    <>
      <Logo />
      <SevenWhys membership={clerkEnabled} signedIn={signedIn} />
    </>
  );
}
