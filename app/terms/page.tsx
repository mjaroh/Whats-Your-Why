import type { Metadata } from "next";
import { CONTACT_EMAIL, H2, LegalPage } from "@/components/LegalPage";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Terms of Use · Askesis" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>By using Askesis you agree to these terms. If you&rsquo;re under 18, read them with a parent or guardian.</p>

      <H2>Who can use Askesis</H2>
      <p>You must be 13 or older. Keep your sign-in private; you&rsquo;re responsible for your account.</p>

      <H2>The AI coach is not a doctor</H2>
      <p>
        The coach is an AI that teaches in Michael Jaroh&rsquo;s voice. It isn&rsquo;t Michael, a therapist, a doctor or
        a dietitian, and it can be wrong. It gives general guidance on mindset, habits and training life, not medical,
        mental health or nutrition treatment. For injuries, health questions, eating or weight concerns, talk to a
        parent and a qualified professional. Michael is an Eastern Orthodox Christian: the coach never brings up faith
        on its own, but if you ask about God or faith it answers from the Orthodox Christian perspective. If
        you&rsquo;re in crisis, call or text 988 (US) or text HOME to 741741; in an emergency call 911.
      </p>

      <H2>The group</H2>
      <p>
        Be for each other. Don&rsquo;t post anything hateful, sexual, violent, bullying or illegal, and don&rsquo;t
        share phone numbers, social accounts, your school or location, or plans to meet up. We can remove posts and
        suspend or ban accounts that break these rules. You own what you post; you give us permission to store and show
        it in the app so the group can see it.
      </p>

      <H2>Membership</H2>
      <p>
        The private coach is a membership at {PLANS.month.label.replace(" / ", " per ")} or{" "}
        {PLANS.year.label.replace(" / ", " per ")}, billed by Stripe. It renews automatically until you cancel. You can
        cancel anytime from Manage membership on your profile; you keep access until the end of the period you&rsquo;ve
        paid for. Payments aren&rsquo;t refunded for partial periods except where the law requires.
      </p>

      <H2>Ending your account</H2>
      <p>
        You can delete your account anytime from your profile. We may suspend accounts that break these terms or put
        others at risk.
      </p>

      <H2>The fine print</H2>
      <p>
        Askesis is provided &ldquo;as is.&rdquo; To the extent the law allows, we aren&rsquo;t liable for indirect
        damages or for decisions you make based on the app. We may update these terms; if we do, we&rsquo;ll change the
        date above.
      </p>

      <H2>Contact</H2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
