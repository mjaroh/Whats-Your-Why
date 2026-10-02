import { AskesisMark } from "./Brand";

// The Askesis A-mark, pinned top left.
export function Logo() {
  return (
    <AskesisMark className="pointer-events-none fixed top-[max(1.25rem,calc(env(safe-area-inset-top)_+_0.5rem))] left-5 z-10 h-8 w-auto text-paper opacity-90" />
  );
}
