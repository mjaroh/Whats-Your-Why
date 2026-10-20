import type { Metadata } from "next";
import { CONTACT_EMAIL, H2, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Askesis" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Askesis (&ldquo;we&rdquo;) runs the Askesis app and whatsyourwhy.app. This policy explains what we collect,
        why, and the choices you have. Askesis is for athletes 13 and older.
      </p>

      <H2>The Seven Whys without an account</H2>
      <p>
        If you do the Seven Whys without creating an account, your answers are sent to our AI provider to write the
        next question and your purpose statement, and are not saved by us. We keep a hashed (scrambled) version of
        your network address for a short time to limit abuse.
      </p>

      <H2>What we collect with an account</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Sign-in details: your email address and, if you give it, your first name (handled by Clerk).</li>
        <li>Your username, profile photo, sport, big day, and your confirmation that you&rsquo;re 13 or older.</li>
        <li>Your why statement and the Seven Whys answers you choose to save.</li>
        <li>Your messages with the AI coach, and videos you send for feedback.</li>
        <li>Messages and videos you post in the group, and messages you save.</li>
        <li>Your habit tracker: the habits you write, what you check off each day, and your sleep.</li>
        <li>Membership status from Stripe. We never see or store your card number.</li>
      </ul>

      <H2>How we use it</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>To run the app: your profile, the group, the coach, the habit tracker and reminders.</li>
        <li>
          To power the AI coach and the Seven Whys. Your messages, why, sport, big day, habit and sleep summary, and
          frames from videos you send are processed by our AI provider (Anthropic) to write replies. We don&rsquo;t use
          your data to train AI models, and our provider doesn&rsquo;t either under its commercial terms.
        </li>
        <li>
          To keep people safe. Group messages, usernames, photos and videos are checked automatically before others
          see them, and group videos are reviewed by an admin. If something you write suggests you may be in danger,
          we show crisis resources and log that it happened so we can improve safety.
        </li>
      </ul>
      <p>We don&rsquo;t sell your information or show you ads.</p>

      <H2>Who else handles it</H2>
      <p>
        We use service providers to run the app: Vercel (hosting and file storage), Neon (database), Clerk (sign-in),
        Stripe (payments) and Anthropic (AI). They process data only to provide their service to us.
      </p>

      <H2>Who can see what</H2>
      <p>
        Your profile, coach chat, why, habits, sleep and big day are private to you. Your username, photo and what you
        post in the group are visible to other members of the group.
      </p>

      <H2>Keeping and deleting your data</H2>
      <p>
        We keep your data while you have an account. You can delete your account anytime from the menu on your profile
        (Delete account). That permanently removes your profile, why, coach chat, group posts, habits, videos and photo,
        and cancels any membership. Safety logs are kept without anything linking them to you.
      </p>

      <H2>Teens and parents</H2>
      <p>
        Askesis isn&rsquo;t for children under 13, and we don&rsquo;t knowingly collect their information. If you
        believe a child under 13 has an account, contact us and we&rsquo;ll delete it. Parents of teens can contact us
        with questions about their child&rsquo;s account.
      </p>

      <H2>Changes and contact</H2>
      <p>
        If we change this policy we&rsquo;ll update the date above. Questions or requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPage>
  );
}
