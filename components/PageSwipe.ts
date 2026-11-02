"use client";

import { useRouter } from "next/navigation";
import { useEffect, type RefObject } from "react";

// Swiping left or right moves between the three main screens, in the order
// of the top bar: Group, Coach, Profile. The page follows the finger a
// little, then slides off; the next one slides in from that side.

export type SwipePage = "group" | "coach" | "profile";

const PAGES: { id: SwipePage; href: string }[] = [
  { id: "group", href: "/community" },
  { id: "coach", href: "/coach" },
  { id: "profile", href: "/profile" },
];
const ENTER_KEY = "askesis:enter";
const DISTANCE = 70; // px to count as a swipe
const EDGE = 24; // px at the screen edges left to iOS's own back swipe

/** True when the touch started in something that scrolls sideways itself (tabs, the habit grid). */
function inSideScroller(el: Element | null, stop: Element): boolean {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    if (n instanceof HTMLElement) {
      if (n.closest("input, textarea, select, [data-no-page-swipe]")) return true;
      const x = getComputedStyle(n).overflowX;
      if ((x === "auto" || x === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
    }
  }
  return false;
}

export function usePageSwipe(page: SwipePage | undefined, shell: RefObject<HTMLElement | null>) {
  const router = useRouter();

  useEffect(() => {
    const root = shell.current;
    if (!page || !root) return;
    const at = PAGES.findIndex((p) => p.id === page);
    const content = root.querySelector<HTMLElement>(".app-scroll");
    PAGES.forEach((p, i) => i !== at && router.prefetch(p.href));

    // Arriving from a swipe: slide in from that side.
    try {
      const from = sessionStorage.getItem(ENTER_KEY);
      sessionStorage.removeItem(ENTER_KEY);
      if (content && (from === "left" || from === "right")) {
        content.classList.add(from === "right" ? "page-enter-right" : "page-enter-left");
        setTimeout(() => content.classList.remove("page-enter-right", "page-enter-left"), 400);
      }
    } catch {
      // Storage blocked: no slide-in, nothing else changes.
    }

    let start: { x: number; y: number; t: number } | null = null;
    let sideways = false;

    const reset = () => {
      if (!content) return;
      content.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
      content.style.transform = "";
      content.style.opacity = "";
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = null;
      sideways = false;
      if (e.touches.length !== 1 || t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return;
      if (inSideScroller(e.target as Element, root)) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onMove = (e: TouchEvent) => {
      if (!start || !content) return;
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!sideways) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          start = null; // scrolling up or down
          return;
        }
        if (Math.abs(dx) < 12) return;
        sideways = true;
      }
      const target = at + (dx < 0 ? 1 : -1);
      const pull = target < 0 || target >= PAGES.length ? 0.15 : 0.4; // resist past the ends
      content.style.transition = "none";
      content.style.transform = `translateX(${dx * pull}px)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || !content) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 800;
      start = null;
      const target = at + (dx < 0 ? 1 : -1);
      if (!sideways || !quick || Math.abs(dx) < DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return reset();
      if (target < 0 || target >= PAGES.length) return reset();
      navigator.vibrate?.(8);
      content.style.transition = "transform 0.18s ease-in, opacity 0.18s ease-in";
      content.style.transform = `translateX(${dx < 0 ? "-35%" : "35%"})`;
      content.style.opacity = "0";
      try {
        sessionStorage.setItem(ENTER_KEY, dx < 0 ? "right" : "left");
      } catch {
        // No slide-in on the next page; the swipe still works.
      }
      setTimeout(() => router.push(PAGES[target].href), 150);
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: true });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", reset);
    };
  }, [page, shell, router]);
}
