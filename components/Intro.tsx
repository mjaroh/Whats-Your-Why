"use client";

import { useEffect, useState } from "react";
import { INTRO_SEEN_KEY } from "@/lib/intro";
import { AskesisMark, WordmarkLetters } from "./Brand";

// The opening sequence: the Askesis wordmark animation (drawn in code, not a
// video, so it's perfectly sharp), then the question of the day for 4
// seconds, then the app underneath fades in. It plays once each time the app
// is opened (per browser session), not on every tab change.
const MARK_MS = 3550; // matches the intro-* keyframes in globals.css
const QUESTION_MS = 4000;
const FADE_MS = 600;
const FALLBACK_QUESTION = "What's your why?";

type Phase = "mark" | "question" | "leaving" | "done";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("mark");
  const [question, setQuestion] = useState<string | null>(null);
  const [questionLoaded, setQuestionLoaded] = useState(false);
  const [showText, setShowText] = useState(false);

  // Start: skip if already seen this session, fetch the question, play.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY)) {
        setPhase("done");
        return;
      }
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Storage blocked: just play it.
    }
    fetch("/api/question")
      .then((r) => r.json())
      .then((d: { question?: string | null }) => setQuestion(d.question ?? null))
      .catch(() => {})
      .finally(() => setQuestionLoaded(true));

    const t = setTimeout(() => setPhase((p) => (p === "mark" ? "question" : p)), MARK_MS);
    return () => clearTimeout(t);
  }, []);

  // Reveal the question once it's loaded (or after a short wait), hold it, fade out.
  useEffect(() => {
    if (phase !== "question") return;
    if (showText) {
      const t = setTimeout(() => setPhase("leaving"), QUESTION_MS);
      return () => clearTimeout(t);
    }
    if (questionLoaded) {
      setShowText(true);
      return;
    }
    const t = setTimeout(() => setShowText(true), 1500);
    return () => clearTimeout(t);
  }, [phase, questionLoaded, showText]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      id="intro"
      role="presentation"
      onClick={() => phase !== "leaving" && setPhase("leaving")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity ease-out"
      style={{ opacity: phase === "leaving" ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      {phase === "mark" ? (
        <div className="intro-logo relative text-white" aria-label="Askesis" role="img">
          <div className="intro-slide relative h-full w-full">
            <AskesisMark title="" className="absolute top-0 left-0 h-full w-auto" />
            <div className="intro-reveal absolute inset-0">
              <WordmarkLetters className="h-full w-full" />
            </div>
          </div>
        </div>
      ) : (
        showText && (
          <div className="rise max-w-xl px-8 text-center">
            <p className="text-xs tracking-[0.25em] text-mute uppercase">Question of the day</p>
            <p className="font-display mt-6 text-3xl leading-snug font-bold tracking-tight text-paper sm:text-4xl">
              {question ?? FALLBACK_QUESTION}
            </p>
          </div>
        )
      )}
    </div>
  );
}
