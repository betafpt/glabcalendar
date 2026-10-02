import type { HTMLAttributes } from "react";

type ChipTone = "neutral" | "pink" | "lilac" | "mint" | "yellow" | "sky" | "coral" | "success" | "warning" | "error";

export function StatusChip({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  const tones: Record<ChipTone, string> = {
    neutral: "bg-surface text-secondary border-stroke",
    pink: "bg-pink/10 text-pink border-pink/20",
    lilac: "bg-lilac text-ink border-ink/5",
    mint: "bg-mint text-ink border-ink/5",
    yellow: "bg-yellow text-ink border-ink/5",
    sky: "bg-sky text-ink border-ink/5",
    coral: "bg-coral text-ink border-ink/5",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/20 text-ink border-warning/25",
    error: "bg-error/10 text-error border-error/20",
  };
  return <span className={`inline-flex min-h-8 items-center rounded-pill border px-3 text-xs font-extrabold ${tones[tone]} ${className}`} {...props} />;
}
