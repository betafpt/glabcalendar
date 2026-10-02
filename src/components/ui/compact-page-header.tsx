"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/language-provider";

export function CompactPageHeader({
  viTitle,
  enTitle,
  viSubtitle,
  enSubtitle,
  action,
  badge,
  showAsterisk = true,
  className = "",
}: {
  viTitle: string;
  enTitle: string;
  viSubtitle?: string;
  enSubtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
  showAsterisk?: boolean;
  className?: string;
}) {
  const { locale } = useLanguage();
  const title = locale === "vi" ? viTitle : enTitle;
  const subtitle = locale === "vi" ? viSubtitle : enSubtitle;

  return (
    <header className={`flex items-end justify-between gap-3 pr-14 lg:pr-0 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-[clamp(2.4rem,10vw,3.5rem)] font-black uppercase leading-[0.98] tracking-[-0.04em] text-ink sm:leading-[0.94]">
            {title}
            {showAsterisk ? <span className="text-pink">*</span> : null}
          </h1>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {subtitle ? (
          <p className="mt-2.5 sm:mt-3 text-[10px] font-black uppercase tracking-[.3em] text-secondary sm:text-xs">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
