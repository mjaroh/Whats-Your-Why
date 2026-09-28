import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-24">
      <Logo />
      <SignIn />
    </main>
  );
}
