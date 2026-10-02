import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-r16 bg-ink/10 motion-reduce:animate-none ${className}`} {...props} />;
}

export function EmptyState({ title, description, className = "" }: { title: string; description?: string; className?: string }) {
  return (
    <div className={`rounded-r22 border border-dashed border-stroke bg-surface px-6 py-10 text-center ${className}`}>
      <p className="font-black text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">{description}</p> : null}
    </div>
  );
}
