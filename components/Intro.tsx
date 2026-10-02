"use client";

import { useEffect, useRef, useState } from "react";
import { INTRO_SEEN_KEY } from "@/lib/intro";

// The opening sequence: the Askesis intro video, then the question of the
// day for 4 seconds, then the app underneath fades in. It plays once each
// time the app is opened (per browser session), not on every tab change.
const QUESTION_MS = 4000;
const FADE_MS = 600;
const FALLBACK_QUESTION = "What's your why?";

type Phase = "video" | "question" | "leaving" | "done";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("video");
  const [question, setQuestion] = useState<string | null>(null);
  const [questionLoaded, setQuestionLoaded] = useState(false);
  const [showText, setShowText] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

    const toQuestion = () => setPhase((p) => (p === "video" ? "question" : p));
    const video = videoRef.current;
    video?.play().catch(toQuestion); // autoplay blocked (e.g. Low Power Mode)
    const stalled = setTimeout(() => {
      if (!video || video.paused) toQuestion();
    }, 1500);
    const cap = setTimeout(toQuestion, 7000);
    return () => {
      clearTimeout(stalled);
      clearTimeout(cap);
    };
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
      {phase === "video" ? (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase("question")}
          onError={() => setPhase("question")}
          aria-label="Askesis"
          className="aspect-square w-full max-w-[min(100vw,100dvh)] object-contain"
        >
          <source src="/intro.mp4" type="video/mp4" />
          <source src="/intro.webm" type="video/webm" />
        </video>
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
