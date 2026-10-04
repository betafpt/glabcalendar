"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type DeleteActionState = {
  ok: boolean;
  messageVi?: string;
  messageEn?: string;
};

function DeleteSubmitButton({
  locale,
  viLabel,
  enLabel,
}: {
  locale: "vi" | "en";
  viLabel: string;
  enLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-pill border border-error/30 bg-error/10 px-5 text-xs font-black uppercase tracking-wider text-error transition hover:bg-error hover:text-white active:scale-press disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? locale === "vi"
          ? "Đang xóa…"
          : "Deleting…"
        : locale === "vi"
        ? viLabel
        : enLabel}
    </button>
  );
}

export function DeleteEntityButton({
  action,
  successHref,
  viLabel = "Xóa",
  enLabel = "Delete",
  viConfirm = "Bạn có chắc muốn xóa mục này? Hành động này không thể hoàn tác.",
  enConfirm = "Are you sure you want to delete this item? This cannot be undone.",
}: {
  action: (
    state: DeleteActionState,
    formData: FormData
  ) => Promise<DeleteActionState>;
  successHref: string;
  viLabel?: string;
  enLabel?: string;
  viConfirm?: string;
  enConfirm?: string;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(action, { ok: false });

  useEffect(() => {
    if (state.ok) {
      router.replace(successHref);
    }
  }, [router, state.ok, successHref]);

  const handleConfirmDelete = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <div className="space-y-2">
      <form ref={formRef} action={formAction} className="hidden" />

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <div>
            <DeleteSubmitButton
              locale={locale}
              viLabel={viLabel}
              enLabel={enLabel}
            />
          </div>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale === "vi" ? "Xác nhận xóa" : "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "vi" ? viConfirm : enConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {locale === "vi" ? "Hủy bỏ" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {locale === "vi" ? "Xóa vĩnh viễn" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!state.ok && (state.messageVi || state.messageEn) ? (
        <p className="text-xs font-bold text-error">
          {locale === "vi" ? state.messageVi : state.messageEn}
        </p>
      ) : null}
    </div>
  );
}
