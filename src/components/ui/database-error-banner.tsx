"use client";

import type { HTMLAttributes } from "react";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";

export interface DatabaseErrorBannerProps extends HTMLAttributes<HTMLDivElement> {
  error?: string | null;
  message?: string | null;
}

export function DatabaseErrorBanner({
  error,
  message,
  className = "",
  ...props
}: DatabaseErrorBannerProps) {
  const { locale } = useLanguage();
  const detail = error || message;
  if (!detail) return null;

  return (
    <div
      role="alert"
      className={`rounded-r22 border border-warning/30 bg-yellow p-4 text-sm font-semibold text-ink shadow-soft ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/10 text-xs font-black select-none"
          aria-hidden="true"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-ink">
            <LocalizedText
              vi="Không thể kết nối cơ sở dữ liệu."
              en="Database connection unavailable."
            />
          </p>
          <p className="mt-0.5 text-xs font-normal text-ink/85 break-words">
            {localizeErrorMessage(detail, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}
