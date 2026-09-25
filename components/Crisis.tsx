// Shown when a message suggests self-harm, suicide, abuse or danger.
// The exercise stops here; there is no way back into it from this screen.
export function Crisis() {
  const link =
    "block border border-paper/30 px-5 py-4 transition-colors hover:border-paper";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="rise w-full max-w-md" role="alert">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Let&rsquo;s pause here.
        </h1>
        <div className="mt-6 space-y-3 leading-relaxed text-paper/75">
          <p>What you just shared matters more than this exercise.</p>
          <p>
            You don&rsquo;t have to carry it alone. Please talk to someone right now: a parent,
            a trusted adult, or one of these free, confidential lines. They&rsquo;re there
            24/7.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <a href="tel:988" className={link}>
            <span className="font-display text-lg font-bold">988 Suicide &amp; Crisis Lifeline</span>
            <span className="mt-1 block text-sm text-paper/60">Call or text 988 (US)</span>
          </a>
          <a href="sms:988" className={link}>
            <span className="font-display text-lg font-bold">Text 988</span>
            <span className="mt-1 block text-sm text-paper/60">If talking feels like too much</span>
          </a>
          <a href="sms:741741?&body=HOME" className={link}>
            <span className="font-display text-lg font-bold">Crisis Text Line</span>
            <span className="mt-1 block text-sm text-paper/60">Text HOME to 741741</span>
          </a>
        </div>

        <p className="mt-10 text-sm text-mute">
          If you or someone else is in immediate danger, call 911.
        </p>
      </div>
    </main>
  );
}
