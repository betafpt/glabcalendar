"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "@/components/production/bottom-navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  Home2,
  Calendar,
  MagicStar,
  Profile2User,
  Camera,
  Setting2,
  LogoutCurve,
} from "@/components/ui/iconsax";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCalendar = pathname === "/calendar" || pathname.startsWith("/calendar");

  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <div className="fixed right-4 top-4 z-40">
          <LanguageSwitcher compact />
        </div>
        {children}
      </div>
    );
  }

  const navItems = [
    { href: "/", label: { vi: "Hôm nay", en: "Today" }, icon: Home2, key: "today" },
    { href: "/calendar", label: { vi: "Lịch", en: "Calendar" }, icon: Calendar, key: "calendar" },
    { href: "/ai", label: { vi: "AI Copilot", en: "AI" }, icon: MagicStar, key: "ai" },
    { href: "/crew", label: { vi: "Nhân sự", en: "Crew" }, icon: Profile2User, key: "crew" },
    { href: "/equipment", label: { vi: "Thiết bị", en: "Equipment" }, icon: Camera, key: "gear" },
    { href: "/settings", label: { vi: "Cài đặt", en: "Settings" }, icon: Setting2, key: "settings" },
  ];

  return (
    <div className={cn("min-h-screen bg-bg text-ink", isCalendar && "lg:h-screen lg:max-h-screen lg:overflow-hidden")}>
      {/* Outer workspace: fluid responsive layout without rigid max-width */}
      <div className={cn("app-shell-container", isCalendar && "lg:h-full lg:overflow-hidden")}>
        {/* CSS grid: 110px icon rail, fluid gap, fluid main content */}
        <div className={cn("lg:app-shell-grid lg:min-h-screen", isCalendar && "lg:h-full lg:min-h-0 lg:overflow-hidden")}>
          {/* Icon Rail: 110px width, blends into canvas */}
          <aside className="hidden w-[110px] border-r border-black/[0.04] bg-transparent py-7 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
            {/* Top: G.Lab Round Logo Monogram */}
            <div className="flex flex-col items-center">
              <Link
                href="/"
                title="G.Lab Studio"
                className="group relative grid size-12 place-items-center rounded-full border border-black/[0.06] bg-white/80 shadow-xs transition-all duration-fast hover:border-pink hover:bg-pink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <span className="font-display text-sm font-black tracking-tight text-ink transition-transform group-hover:scale-105">
                  GL<span className="text-pink text-xs leading-none">*</span>
                </span>
              </Link>
            </div>

            {/* Center: Circular Navigation Icons, vertically spaced */}
            <nav className="my-auto flex flex-col items-center gap-4 py-4">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const IconComp = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    title={item.label.vi}
                    aria-current={active ? "page" : undefined}
                    className={`group relative grid size-12 place-items-center rounded-full transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink active:scale-press ${
                      active
                        ? "bg-ink text-white shadow-soft"
                        : "text-secondary hover:bg-white/80 hover:text-ink"
                    }`}
                  >
                    <IconComp size={22} variant={active ? "Bold" : "Linear"} />
                    {active ? (
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-pink" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom: Quick Actions (Language Switcher & Logout) */}
            <div className="flex flex-col items-center gap-3">
              <LanguageSwitcher compact />
              <Link
                href="/login"
                title="Đăng xuất / Tài khoản"
                className="grid size-11 place-items-center rounded-full text-secondary transition-all hover:bg-white/80 hover:text-ink"
              >
                <LogoutCurve size={20} variant="Linear" />
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className={cn("min-w-0 flex-1 py-4 sm:py-6", isCalendar && "lg:py-3.5 lg:h-full lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden")}>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Responsive: replaces vertical rail) */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
