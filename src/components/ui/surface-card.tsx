import type { HTMLAttributes } from "react";

export function SurfaceCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-r28 border border-stroke bg-surface p-5 sm:p-6 ${className}`} {...props} />;
}

export function PastelCard({ tone = "lilac", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "lilac" | "mint" | "yellow" | "sky" | "coral" }) {
  const tones = { lilac: "bg-lilac", mint: "bg-mint", yellow: "bg-yellow", sky: "bg-sky", coral: "bg-coral" };
  return <div className={`rounded-r28 border border-ink/5 p-5 ${tones[tone]} ${className}`} {...props} />;
}
