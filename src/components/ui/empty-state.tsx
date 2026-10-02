import type { ReactNode } from "react";
import { LocalizedText } from "@/components/ui/localized-text";

export interface EmptyStateProps {
  icon?: ReactNode;
  titleVi: string;
  titleEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  titleVi,
  titleEn,
  descriptionVi,
  descriptionEn,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-r28 border border-dashed border-ink/20 bg-surface/90 p-8 sm:p-12 text-center shadow-soft ${className}`}
    >
      {icon ? (
        <div
          className="mx-auto grid size-14 place-items-center rounded-full bg-white text-2xl shadow-soft select-none"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h3
        className={`${
          icon ? "mt-4" : ""
        } font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink`}
      >
        <LocalizedText vi={titleVi} en={titleEn} />
      </h3>
      {descriptionVi && descriptionEn ? (
        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm font-medium text-secondary">
          <LocalizedText vi={descriptionVi} en={descriptionEn} />
        </p>
      ) : null}
      {action ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      ) : null}
    </div>
  );
}
