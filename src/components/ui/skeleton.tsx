import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-r16 bg-ink/[0.06] ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
