"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Home2, Calendar, MagicStar, Profile2User, Camera } from "@/components/ui/iconsax";

type IconName = "today" | "calendar" | "ai" | "crew" | "gear";

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const variant = active ? "Bold" : "Linear";
  const size = 20;
  if (name === "today") return <Home2 size={size} variant={variant} />;
  if (name === "calendar") return <Calendar size={size} variant={variant} />;
  if (name === "ai") return <MagicStar size={size} variant={variant} />;
  if (name === "crew") return <Profile2User size={size} variant={variant} />;
  return <Camera size={size} variant={variant} />;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { messages } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  // Reset optimistic pending state once pathname matches target
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const items = [
    { href: "/today", key: "today" as const, label: messages.nav.today },
    { href: "/calendar", key: "calendar" as const, label: messages.nav.calendar },
    { href: "/ai", key: "ai" as const, label: messages.nav.ai },
    { href: "/crew", key: "crew" as const, label: messages.nav.crew },
    { href: "/equipment", key: "gear" as const, label: messages.nav.gear },
  ];

  // Prioritize pending optimistic target for instant 0ms active visual response
  const currentTarget = pendingHref !== null ? pendingHref : pathname;

  return (
    <>
      {/* Instant Top Loading Bar for smooth transition indicator */}
      <AnimatePresence>
        {pendingHref !== null ? (
          <motion.div
            role="progressbar"
            aria-label="Đang chuyển trang..."
            className="fixed top-0 inset-x-0 z-[100] h-[3px] overflow-hidden bg-pink/20 pointer-events-none"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
          >
            <motion.div
              className="h-full origin-left bg-pink shadow-[0_0_8px_rgba(255,79,154,0.8)]"
              initial={shouldReduceMotion ? false : { scaleX: 0.18 }}
              animate={{ scaleX: shouldReduceMotion ? 1 : 0.88 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-[28px] border border-ink/10 bg-ink p-1.5 text-white shadow-nav lg:static lg:mx-0 lg:flex lg:h-fit lg:w-full lg:max-w-none lg:flex-col lg:gap-1 lg:rounded-r22 lg:bg-transparent lg:p-0 lg:text-ink lg:shadow-none"
      >
        <div className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1">
          {items.map((item) => {
            const active = currentTarget.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (pathname !== item.href) {
                    setPendingHref(item.href);
                  }
                }}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[10px] font-extrabold transition-all duration-fast focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-press lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm lg:focus-visible:ring-offset-bg ${
                  active
                    ? "bg-pink text-white lg:bg-ink"
                    : "text-white/68 hover:text-white lg:text-secondary lg:hover:bg-surface lg:hover:text-ink"
                }`}
              >
                <NavIcon name={item.key} active={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
