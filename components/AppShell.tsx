"use client";

import { useEffect } from "react";

/**
 * A full-screen screen with a fixed top bar and footer: only the middle
 * scrolls (see .app-shell in globals.css). It follows the visible area of the
 * screen, so when the phone keyboard opens the bar stays at the top and the
 * composer sits right above the keyboard.
 */
export function AppShell(props: {
  header: React.ReactNode;
  footer?: React.ReactNode;
  scrollRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    const sync = () => {
      if (Math.abs(vv.scale - 1) > 0.01) return; // pinch-zoomed: leave it
      root.setProperty("--app-height", `${vv.height}px`);
      root.setProperty("--app-top", `${vv.offsetTop}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.removeProperty("--app-height");
      root.removeProperty("--app-top");
    };
  }, []);

  return (
    <div className="app-shell">
      {props.header}
      <div ref={props.scrollRef} className="app-scroll">
        {props.children}
      </div>
      {props.footer}
    </div>
  );
}

/** Scrolls an AppShell's middle to the newest message. */
export function scrollToEnd(el: HTMLElement | null, smooth = true) {
  el?.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}
