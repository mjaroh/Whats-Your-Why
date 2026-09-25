// The Askesis A-mark (white on transparent, public/askesis-mark.png).
export function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/askesis-mark.png"
      alt="Askesis"
      width={21}
      height={32}
      className="pointer-events-none fixed top-5 left-5 z-10 h-8 w-auto opacity-90"
    />
  );
}
