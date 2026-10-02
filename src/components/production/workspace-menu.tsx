"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { LocalizedText } from "@/components/ui/localized-text";
import { Setting2, LogoutCurve } from "@/components/ui/iconsax";

export function WorkspaceMenu({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-label="Cài đặt & Tài khoản"
        onClick={() => setIsOpen((prev) => !prev)}
        className="grid size-11 cursor-pointer place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press select-none"
      >
        <Setting2 size={18} variant="Linear" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-52 rounded-r22 border border-stroke bg-surface p-2 shadow-nav">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 items-center gap-2.5 rounded-r16 px-3 text-xs font-black uppercase tracking-wider text-ink transition hover:bg-bg"
          >
            <Setting2 size={16} variant="Linear" className="text-secondary" />
            <LocalizedText vi="Cài đặt" en="Settings" />
          </Link>
          <div className="mt-1 border-t border-stroke/70 pt-1">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full min-h-11 items-center gap-2.5 rounded-r16 px-3 text-xs font-black uppercase tracking-wider text-error transition hover:bg-error/10 active:scale-press"
              >
                <LogoutCurve size={16} variant="Linear" />
                <LocalizedText vi="Đăng xuất" en="Sign Out" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
