import type { HTMLAttributes } from "react";

export function SectionHeader({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-xl font-black tracking-[-0.025em] text-ink ${className}`} {...props} />;
}

export function MetaLabel({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`text-[11px] font-black uppercase tracking-[0.11em] text-secondary ${className}`} {...props} />;
}

export function Divider({ className = "", ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`border-0 border-t border-stroke ${className}`} {...props} />;
}
