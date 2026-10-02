"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

import { Home2, Calendar, Folder2, Profile2User, Camera } from "@/components/ui/iconsax";

type IconName = "today" | "calendar" | "projects" | "crew" | "gear";

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const variant = active ? "Bold" : "Linear";
  const size = 20;
  if (name === "today") return <Home2 size={size} variant={variant} />;
  if (name === "calendar") return <Calendar size={size} variant={variant} />;
  if (name === "projects") return <Folder2 size={size} variant={variant} />;
  if (name === "crew") return <Profile2User size={size} variant={variant} />;
  return <Camera size={size} variant={variant} />;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const { messages } = useLanguage();
  const items = [
    { href: "/", key: "today" as const, label: messages.nav.today },
    { href: "/calendar", key: "calendar" as const, label: messages.nav.calendar },
    { href: "/projects", key: "projects" as const, label: messages.nav.projects },
    { href: "/crew", key: "crew" as const, label: messages.nav.crew },
    { href: "/equipment", key: "gear" as const, label: messages.nav.gear },
  ];

  return (
    <nav aria-label="Primary" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-[28px] border border-ink/10 bg-ink p-1.5 text-white shadow-nav lg:static lg:mx-0 lg:flex lg:h-fit lg:w-full lg:max-w-none lg:flex-col lg:gap-1 lg:rounded-r22 lg:bg-transparent lg:p-0 lg:text-ink lg:shadow-none">
      <div className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[10px] font-extrabold transition duration-fast focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-press lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm lg:focus-visible:ring-offset-bg ${
                active ? "bg-pink text-white lg:bg-ink" : "text-white/68 hover:text-white lg:text-secondary lg:hover:bg-surface lg:hover:text-ink"
              }`}
            >
              <NavIcon name={item.key} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
