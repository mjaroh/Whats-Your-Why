"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AskesisMark, WordmarkLetters } from "./Brand";

const LEAVE_MS = 850; // matches the about-* leaving animations in globals.css

/**
 * What "Askesis" means. Opens over whatever screen the athlete is on (so
 * their chat, draft and scroll are untouched underneath); tapping the big
 * A-mark at the bottom shoots it up off the screen and the page goes with it.
 */
export function AboutAskesis({ onClose }: { onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLeaving(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => closeRef.current(), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What Askesis means"
      className={`about-sheet fixed inset-0 z-40 overflow-y-auto bg-ink ${leaving ? "about-leaving" : ""}`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-6 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))]">
        <div className="about-wordmark relative mx-auto text-paper" role="img" aria-label="Askesis">
          <div className="about-slide relative h-full w-full">
            <AskesisMark title="" className="absolute top-0 left-0 h-full w-auto" />
            <div className="about-reveal absolute inset-0">
              <WordmarkLetters className="h-full w-full" />
            </div>
          </div>
        </div>

        <div className="about-text mt-14 space-y-6 text-lg leading-relaxed text-paper/80">
          <p>
            Comes from the ancient Greek word <em className="text-paper">askēsis</em> (ἄσκησις), meaning
            &ldquo;exercise,&rdquo; &ldquo;training,&rdquo; or &ldquo;practice&rdquo;.
          </p>
          <p>
            Originally referred to physical conditioning by athletes or training in a craft, rather than self-denial.
          </p>
          <p>
            Later adopted by ancient Greek philosophers (like the Stoics and Cynics) to describe the daily mental and
            moral training needed to make virtue a habit.
          </p>
          <p className="font-display text-2xl leading-snug font-bold tracking-tight text-paper">
            Askesis is active, purposive training to strengthen the mind and align actions with reason.
          </p>
          <p>
            Asceticism often emphasizes strict abstinence, austerity, or the punishing denial of bodily needs as an end
            in itself.
          </p>
          <p>
            In the 2nd through 4th centuries, early Christian writers adopted the Greek philosophical concept of askesis
            and reoriented it toward the Christian faith. Instead of training to achieve Stoic self-reliance, they used
            askesis as a &ldquo;spiritual workout&rdquo; to reorder human desires, master the &ldquo;passions&rdquo;
            (uncontrolled impulses like anger, pride, and lust), and draw closer to God.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLeaving(true)}
          disabled={leaving}
          aria-label="Back to the app"
          className="about-launch mx-auto mt-auto block pt-20 pb-4 text-paper"
        >
          <AskesisMark title="" className="h-36 w-auto" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** The A-mark as a button that opens the Askesis page. */
export function LogoButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="What Askesis means" className={className}>
        <AskesisMark title="" className="h-8 w-auto opacity-90" />
      </button>
      {open && <AboutAskesis onClose={() => setOpen(false)} />}
    </>
  );
}
