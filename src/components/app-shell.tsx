"use client";

import { BottomNavigation } from "@/components/production/bottom-navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import Link from "next/link";
import { LocalizedText } from "@/components/ui/localized-text";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <div className="min-h-screen bg-bg text-ink"><div className="fixed right-4 top-4 z-40"><LanguageSwitcher compact /></div>{children}</div>;
  }
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-stroke/80 px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <LinkBrand />
          <div className="mt-8"><BottomNavigation /></div>
          <div className="mt-5 space-y-1 border-t border-stroke pt-5 text-sm font-bold text-secondary">
            <Link prefetch={true} className="block rounded-r16 px-3 py-2 hover:bg-surface hover:text-ink" href="/shoots"><LocalizedText vi="Buổi quay" en="Shoots" /></Link>
            <Link prefetch={true} className="block rounded-r16 px-3 py-2 hover:bg-surface hover:text-ink" href="/clients"><LocalizedText vi="Khách hàng" en="Clients" /></Link>
            <Link prefetch={true} className="block rounded-r16 px-3 py-2 hover:bg-surface hover:text-ink" href="/integrations/google-calendar"><LocalizedText vi="Đồng bộ lịch" en="Calendar Sync" /></Link>
            <Link prefetch={true} className="block rounded-r16 px-3 py-2 hover:bg-surface hover:text-ink" href="/settings"><LocalizedText vi="Cài đặt" en="Settings" /></Link>
          </div>
          <div className="mt-auto space-y-3">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-r16 border border-stroke/60 bg-surface/70 p-2.5 transition hover:bg-surface"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1e293b] text-xs font-black text-white">
                GL
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">G.Lab Studio</p>
                <p className="truncate text-[10px] text-secondary">
                  <LocalizedText vi="Không gian làm việc" en="Workspace" />
                </p>
              </div>
            </Link>
            <LanguageSwitcher />
          </div>
        </aside>
        <div className="min-w-0">
          {children}
        </div>
      </div>
      <div className="lg:hidden"><BottomNavigation /></div>
    </div>
  );
}
function LinkBrand() {
  return (
    <Link href="/" className="inline-flex items-baseline gap-1 rounded-lg text-xl font-black tracking-[-0.04em] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
      G.LAB<span className="text-pink">*</span>
    </Link>
  );
}
