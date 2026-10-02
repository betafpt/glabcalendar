import type { HTMLAttributes } from "react";

export function EditorialPageTitle({ children, className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={`font-display text-[clamp(3.25rem,14vw,7.5rem)] font-black uppercase leading-[0.78] tracking-[-0.055em] text-ink ${className}`} {...props}>
      {children}
    </h1>
  );
}

export function AsteriskAccent({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block text-pink ${className}`}>*</span>;
}
