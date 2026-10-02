import type { HTMLAttributes } from "react";

export function ProgressBar({ value, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { value: number }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 overflow-hidden rounded-pill bg-ink/10 ${className}`} {...props}>
      <div className="h-full rounded-pill bg-pink transition-[width] duration-slow motion-reduce:transition-none" style={{ width: `${bounded}%` }} />
    </div>
  );
}
