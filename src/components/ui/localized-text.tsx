"use client";

import { useLanguage } from "@/components/language-provider";

export function LocalizedText({ vi, en }: { vi: string; en: string }) {
  const { locale } = useLanguage();
  return <>{locale === "vi" ? vi : en}</>;
}

export function LocalizedPageHeader({
  viTitle,
  enTitle,
  viSubtitle,
  enSubtitle,
}: {
  viTitle: string;
  enTitle: string;
  viSubtitle?: string;
  enSubtitle?: string;
}) {
  const { locale } = useLanguage();
  const title = locale === "vi" ? viTitle : enTitle;
  const subtitle = locale === "vi" ? viSubtitle : enSubtitle;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-[clamp(3.4rem,14vw,7.5rem)] font-black uppercase leading-[0.78] tracking-[-0.055em] text-ink">
        {title}<span aria-hidden="true" className="text-pink">*</span>
      </h1>
      {subtitle ? <p className="max-w-2xl text-sm font-medium leading-6 text-secondary sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
