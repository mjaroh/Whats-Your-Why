import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SevenWhys } from "@/components/SevenWhys";
import { getWhy } from "@/lib/athletes";
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
    // Members open straight into their coach, unless they chose to retake.
    const { retake } = await searchParams;
    if (userId && !retake && (await getWhy(userId).catch(() => null))) redirect("/coach");
  }
  return (
    <>
      <Logo />
      <SevenWhys membership={clerkEnabled} signedIn={signedIn} />
    </>
  );
}
