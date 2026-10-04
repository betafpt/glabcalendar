"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { disableGoogleSyncForShootAction } from "../actions";

export function ShootGoogleSyncStatus({
  shootId,
  synced,
  canManage,
  syncEnabledForShoot,
}: {
  shootId: string;
  synced: boolean;
  canManage: boolean;
  syncEnabledForShoot: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function disableSync() {
    startTransition(async () => {
      const result = await disableGoogleSyncForShootAction(shootId);
      setFeedback(result.messageVi ?? null);
      if (result.ok) setConfirmOpen(false);
    });
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-r18 border border-stroke/70 bg-surface/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-black text-ink">
          Google Calendar <span className="text-secondary">·</span>{" "}
          <span className={synced ? "text-emerald-700" : "text-secondary"}>
            {synced ? "Đã đồng bộ" : "Đang chờ đồng bộ"}
          </span>
        </p>
        {feedback ? <p className="mt-1 text-[11px] font-semibold text-secondary">{feedback}</p> : null}
      </div>

      {canManage && syncEnabledForShoot ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Tùy chọn Google Calendar"
                className="grid size-9 place-items-center rounded-full text-lg font-black text-secondary transition hover:bg-bg hover:text-ink"
              >
                ⋯
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-error focus:text-error">
                Không đồng bộ lịch này
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Không đồng bộ lịch này?</AlertDialogTitle>
                <AlertDialogDescription>
                  G.Lab sẽ ngừng đồng bộ buổi quay này trong các lần tiếp theo. Event đã có trên Google Calendar sẽ không bị xóa tự động.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Giữ đồng bộ</AlertDialogCancel>
                <AlertDialogAction disabled={isPending} onClick={disableSync}>
                  {isPending ? "Đang lưu..." : "Không đồng bộ"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
