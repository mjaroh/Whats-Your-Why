// Placeholder for the Askesis A-mark. Swap the SVG for the real mark.
export function Logo() {
  return (
    <div className="pointer-events-none fixed top-5 left-5 z-10 opacity-80" aria-label="Askesis">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 3 L29 29 H23 L16 14 L9 29 H3 Z" fill="currentColor" />
        <rect x="11" y="21" width="10" height="2.5" fill="var(--color-ink)" />
      </svg>
    </div>
  );
}
