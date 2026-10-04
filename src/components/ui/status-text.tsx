"use client";

import { useLanguage } from "@/components/language-provider";
import { getStatusLabel } from "@/lib/status-labels";

export function StatusText({ status }: { status: string }) {
  const { locale } = useLanguage();
  return <>{getStatusLabel(status, locale)}</>;
}
