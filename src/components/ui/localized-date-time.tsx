"use client";

import { useLanguage } from "@/components/language-provider";

export function LocalizedDateTime({
  value,
  options,
  uppercase = false,
}: {
  value: string;
  options: Intl.DateTimeFormatOptions;
  uppercase?: boolean;
}) {
  const { locale } = useLanguage();
  const text = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", options).format(new Date(value));
  return <>{uppercase ? text.toUpperCase() : text}</>;
}
