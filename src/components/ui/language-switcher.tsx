"use client";

import { useLanguage } from "@/components/language-provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, messages, setLocale } = useLanguage();

  if (compact) {
    const nextLocale = locale === "vi" ? "en" : "vi";
    return (
      <button
        type="button"
        onClick={() => setLocale(nextLocale)}
        aria-label={`${messages.language.label}: ${messages.language[locale]}`}
        className="grid min-h-11 min-w-11 place-items-center rounded-full border border-stroke bg-surface px-2 text-[10px] font-black uppercase tracking-[0.08em] shadow-soft transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-press"
      >
        {locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-stroke bg-surface p-1 shadow-soft"
      role="group"
      aria-label={messages.language.label}
    >
      {(["vi", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={`min-h-11 rounded-full px-4 text-[11px] font-black tracking-[0.08em] transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-press ${
            locale === value ? "bg-ink text-white" : "text-secondary hover:bg-bg"
          } min-w-11`}
        >
          {messages.language[value]}
        </button>
      ))}
    </div>
  );
}
