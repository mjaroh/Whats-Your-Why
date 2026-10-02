import { LogoButton } from "./AboutAskesis";

// The Askesis A-mark, pinned top left. Tapping it opens what Askesis means.
export function Logo() {
  return (
    <LogoButton className="fixed top-[max(1.25rem,calc(env(safe-area-inset-top)_+_0.5rem))] left-5 z-10 text-paper" />
  );
}
