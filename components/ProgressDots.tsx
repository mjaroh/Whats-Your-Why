import { TOTAL_QUESTIONS } from "@/lib/constants";

export function ProgressDots({ filled }: { filled: number }) {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={TOTAL_QUESTIONS}
      aria-valuenow={filled}
      aria-label={`${filled} of ${TOTAL_QUESTIONS} answered`}
    >
      {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full transition-colors duration-700 ${
            i < filled ? "bg-paper" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
