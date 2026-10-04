"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/login/actions";
import { clearClientDataOnSignOut } from "@/lib/client-cleanup";
import { LocalizedText } from "@/components/ui/localized-text";
import { LogoutCurve } from "@/components/ui/iconsax";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await clearClientDataOnSignOut();
      await logoutAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-pill border border-error/40 bg-error/10 px-5 text-xs font-black uppercase tracking-wider text-error transition hover:bg-error hover:text-white active:scale-press disabled:opacity-50"
    >
      <LogoutCurve size={16} variant="Linear" />
      <LocalizedText
        vi={isPending ? "Đang đăng xuất..." : "Đăng xuất"}
        en={isPending ? "Signing out..." : "Sign out"}
      />
    </button>
  );
}
