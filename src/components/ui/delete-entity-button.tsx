"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export type DeleteActionState = {
  ok: boolean;
  messageVi?: string;
  messageEn?: string;
};

function DeleteSubmitButton({ locale, viLabel, enLabel }: { locale: "vi" | "en"; viLabel: string; enLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-pill border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (locale === "vi" ? "Đang xóa…" : "Deleting…") : locale === "vi" ? viLabel : enLabel}
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
  action: (state: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
  successHref: string;
  viLabel?: string;
  enLabel?: string;
  viConfirm?: string;
  enConfirm?: string;
}) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [state, formAction] = useFormState(action, { ok: false });

  useEffect(() => {
    if (state.ok) {
      router.replace(successHref);
    }
  }, [router, state.ok, successHref]);

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          const message = locale === "vi" ? viConfirm : enConfirm;
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <DeleteSubmitButton locale={locale} viLabel={viLabel} enLabel={enLabel} />
      </form>
      {!state.ok && (state.messageVi || state.messageEn) ? (
        <p className="text-xs font-bold text-red-700">{locale === "vi" ? state.messageVi : state.messageEn}</p>
      ) : null}
    </div>
  );
}
