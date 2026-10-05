"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Refresh2 } from "@/components/ui/iconsax";
import { useToast } from "@/components/ui/toast";
import { triggerGoogleCalendarSyncAction } from "@/app/integrations/google-calendar/actions";
import { cn } from "@/lib/utils";

type GoogleConnectionInfo = {
  connected: boolean;
  lastSyncedAt?: string | null;
  accountEmail?: string | null;
};

type CalendarQuickSyncButtonProps = {
  initialConnection?: GoogleConnectionInfo | null;
  className?: string;
};

export function CalendarQuickSyncButton({
  initialConnection,
  className,
}: CalendarQuickSyncButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const lastSyncTimestampRef = useRef<number>(
    initialConnection?.lastSyncedAt
      ? new Date(initialConnection.lastSyncedAt).getTime()
      : Date.now()
  );

  const isConnected = Boolean(initialConnection?.connected);

  const performSync = useCallback(
    (silent = false) => {
      if (isPending) return;

      startTransition(async () => {
        try {
          const result = await triggerGoogleCalendarSyncAction();
          lastSyncTimestampRef.current = Date.now();

          if (result.ok) {
            const isNoOp =
              result.message?.includes("0 đã xuất, 0 đã nhập") ||
              result.message?.includes("0 exported, 0 imported");

            if (!silent || !isNoOp) {
              showToast({
                message: result.message || "Đồng bộ Google Calendar thành công!",
                duration: 3500,
              });
            }
            router.refresh();
          } else {
            if (!silent) {
              showToast({
                message: result.message || "Đồng bộ thất bại. Vui lòng kiểm tra kết nối.",
                duration: 4000,
              });
            }
          }
        } catch (err) {
          if (!silent) {
            showToast({
              message: "Lỗi kết nối khi đồng bộ Google Calendar.",
              duration: 4000,
            });
          }
        }
      });
    },
    [isPending, router, showToast]
  );

  // Background auto-pull when user returns to this tab
  useEffect(() => {
    if (!isConnected) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastSyncTimestampRef.current;
        // Cooldown: 90 seconds
        if (elapsed >= 90_000) {
          performSync(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, performSync]);

  if (!isConnected) {
    return (
      <Link
        href="/integrations/google-calendar"
        title="Chưa kết nối Google Calendar. Bấm để kết nối."
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-2.5 py-1 text-[11px] font-bold text-secondary shadow-xs hover:border-pink/40 hover:text-ink transition-colors",
          className
        )}
      >
        <span className="size-2 rounded-full bg-secondary/30" />
        <span className="text-[10px] font-bold text-secondary">Kết nối Google</span>
      </Link>
    );
  }

  const tooltipTitle = isPending
    ? "Đang đồng bộ Google Calendar..."
    : `Google Calendar: ${initialConnection?.accountEmail ?? "Đã kết nối"}\nNhấn để đồng bộ ngay. Chuột phải để mở Cài đặt.`;

  return (
    <button
      type="button"
      onClick={() => performSync(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        router.push("/integrations/google-calendar");
      }}
      disabled={isPending}
      title={tooltipTitle}
      aria-label="Đồng bộ Google Calendar"
      className={cn(
        "group hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink shadow-xs transition-all",
        "hover:border-pink/40 hover:bg-white active:scale-press",
        isPending && "cursor-wait opacity-80",
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full transition-colors",
          isPending
            ? "bg-pink animate-pulse"
            : "bg-[#1da875] shadow-[0_0_6px_rgba(29,168,117,0.5)]"
        )}
      />
      <Refresh2
        size={11}
        className={cn(
          "text-secondary group-hover:text-ink transition-transform",
          isPending && "animate-spin text-pink"
        )}
      />
      <span className="text-[10px] font-bold text-secondary group-hover:text-ink">
        {isPending ? "Đang đồng bộ..." : "Sync"}
      </span>
    </button>
  );
}
