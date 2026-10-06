"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useLanguage } from "@/components/language-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash } from "@/components/ui/iconsax";
import type { DeleteActionState } from "@/components/ui/delete-entity-button";
import { deleteShootAction } from "../actions";

function DeleteConfirmButton({ locale }: { locale: "vi" | "en" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-pill bg-error px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-error/90 active:scale-press disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? locale === "vi"
          ? "Đang xóa…"
          : "Deleting…"
        : locale === "vi"
          ? "Xóa vĩnh viễn"
          : "Delete permanently"}
    </button>
  );
}

export function ShootDeleteButton({
  shootId,
  shootTitle,
  dateLabel,
  timeLabel,
}: {
  shootId: string;
  shootTitle: string;
  dateLabel: string;
  timeLabel: string;
}) {
  const { locale } = useLanguage();
  const [state, formAction] = useFormState<DeleteActionState, FormData>(
    deleteShootAction.bind(null, shootId),
    { ok: false }
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={locale === "vi" ? "Xóa buổi quay" : "Delete shoot"}
          title={locale === "vi" ? "Xóa buổi quay" : "Delete shoot"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#E85B7E]/20 bg-transparent text-[#E85B7E] transition hover:border-[#E85B7E]/35 hover:bg-[#E85B7E]/[0.08] active:scale-press sm:w-auto sm:gap-2 sm:rounded-pill sm:px-4"
        >
          <Trash size={18} variant="Linear" />
          <span className="hidden text-xs font-black uppercase tracking-wider sm:inline">
            {locale === "vi" ? "Xóa buổi quay" : "Delete shoot"}
          </span>
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-r28 p-5 sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-r28 sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {locale === "vi" ? "Xóa buổi quay?" : "Delete this shoot?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <div className="rounded-r16 border border-[#E85B7E]/15 bg-[#E85B7E]/[0.06] px-4 py-3 text-ink">
                <p className="text-sm font-black">{shootTitle}</p>
                <p className="mt-1 text-xs font-semibold text-secondary">
                  {dateLabel} · {timeLabel}
                </p>
              </div>
              <p>
                {locale === "vi"
                  ? "Lịch quay, phân công ekip, đặt thiết bị và lịch Google liên kết sẽ bị gỡ/xóa theo logic backend hiện tại."
                  : "The shoot schedule, crew assignments, equipment bookings, and linked Google Calendar event will be removed according to the current backend logic."}
              </p>
              <p className="font-bold text-error">
                {locale === "vi"
                  ? "Hành động này hiện chưa có cơ chế khôi phục trong giao diện."
                  : "This action currently has no recovery flow in the interface."}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction}>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {locale === "vi" ? "Hủy" : "Cancel"}
            </AlertDialogCancel>
            <DeleteConfirmButton locale={locale} />
          </AlertDialogFooter>
        </form>

        {!state.ok && (state.messageVi || state.messageEn) ? (
          <p className="text-xs font-bold text-error">
            {locale === "vi" ? state.messageVi : state.messageEn}
          </p>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
