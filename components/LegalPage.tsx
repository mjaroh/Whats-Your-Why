import { Logo } from "./Logo";

// Shared layout for the privacy policy and terms.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@whatsyourwhy.app";
export const LEGAL_UPDATED = "October 17, 2026";

export function LegalPage(props: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-28 pb-[max(4rem,calc(env(safe-area-inset-bottom)+2rem))]">
      <Logo />
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{props.title}</h1>
      <p className="mt-2 text-sm text-mute">Last updated {LEGAL_UPDATED}</p>
      <div className="legal mt-10 space-y-5 leading-relaxed text-paper/80">{props.children}</div>
      <p className="mt-16 text-sm text-mute">
        <a href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </a>
        {" · "}
        <a href="/terms" className="underline underline-offset-4">
          Terms of Use
        </a>
      </p>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display pt-6 text-xl font-bold tracking-tight text-paper">{children}</h2>;
}
