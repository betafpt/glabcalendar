import type { HTMLAttributes } from "react";

export function Avatar({ initials, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { initials: string }) {
  return (
    <div className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-ink/10 bg-lilac text-xs font-black uppercase text-ink ${className}`} {...props}>
      {initials.slice(0, 2)}
    </div>
  );
}

export function AvatarStack({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <div className={`flex -space-x-2 ${className}`} aria-label={`${items.length} people`}>
      {items.slice(0, 4).map((initials, index) => (
        <Avatar key={`${initials}-${index}`} initials={initials} className="ring-2 ring-bg" />
      ))}
      {items.length > 4 ? <div className="grid size-10 place-items-center rounded-full bg-ink text-[11px] font-black text-white ring-2 ring-bg">+{items.length - 4}</div> : null}
    </div>
  );
}
