"use client";

import { useFormState, useFormStatus } from "react-dom";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { LocalizedText } from "@/components/ui/localized-text";
import { ArrowDown2 } from "@/components/ui/iconsax";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { createShootAction, type ShootActionState } from "./actions";

const initialState: ShootActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-pill bg-ink px-6 text-sm font-black uppercase tracking-[.12em] text-white transition duration-fast hover:bg-pink active:scale-press disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <LocalizedText vi="ĐANG TẠO..." en="CREATING..." /> : <LocalizedText vi="TẠO BUỔI QUAY →" en="CREATE SHOOT →" />}
    </button>
  );
}

function FieldCard({ children, tone = "bg-bg" }: { children: React.ReactNode; tone?: string }) {
  return <div className={`rounded-r18 p-3 ${tone}`}>{children}</div>;
}

const selectClass = `${fieldClass} appearance-none cursor-pointer border-0 bg-surface/90 pr-11 text-sm font-extrabold shadow-xs transition hover:bg-white focus-visible:ring-2 focus-visible:ring-ink/20`;

function StyledSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${selectClass} ${props.className ?? ""}`}>
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-secondary" aria-hidden="true">
        <ArrowDown2 size={16} variant="Linear" />
      </span>
    </div>
  );
}

export function ShootCreateForm({
  projects,
  defaultProjectId,
}: {
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}) {
  const [state, formAction] = useFormState(createShootAction, initialState);
  const { locale } = useLanguage();
  const feedback = locale === "vi" ? state.messageVi ?? state.message : state.messageEn ?? state.message;

  return (
    <form action={formAction} className="space-y-2.5">
      <FieldCard tone="bg-coral">
        <label htmlFor="title" className={labelClass}><LocalizedText vi="TÊN BUỔI QUAY" en="SHOOT TITLE" /></label>
        <input id="title" name="title" required className={`${fieldClass} border-0 bg-surface/85 text-base`} placeholder={locale === "vi" ? "Ngày quay chiến dịch 01" : "Campaign day 01"} />
        {state.fieldErrors?.title?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.title[0], locale)}</p> : null}
      </FieldCard>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <FieldCard tone="bg-lilac">
          <label htmlFor="projectId" className={labelClass}><LocalizedText vi="DỰ ÁN" en="PROJECT" /></label>
          <StyledSelect
            id="projectId"
            name="projectId"
            defaultValue={defaultProjectId || ""}
          >
            <option value=""><LocalizedText vi="Không thuộc dự án" en="No project" /></option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </StyledSelect>
        </FieldCard>
        <FieldCard tone="bg-mint">
          <label htmlFor="status" className={labelClass}><LocalizedText vi="TRẠNG THÁI" en="STATUS" /></label>
          <StyledSelect id="status" name="status" defaultValue="planned">
            <option value="planned"><LocalizedText vi="Kế hoạch" en="Planned" /></option>
            <option value="confirmed"><LocalizedText vi="Đã xác nhận" en="Confirmed" /></option>
            <option value="in_progress"><LocalizedText vi="Đang diễn ra" en="In progress" /></option>
            <option value="completed"><LocalizedText vi="Hoàn thành" en="Completed" /></option>
            <option value="cancelled"><LocalizedText vi="Đã hủy" en="Cancelled" /></option>
          </StyledSelect>
        </FieldCard>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <FieldCard>
          <label htmlFor="startsAt" className={labelClass}><LocalizedText vi="BẮT ĐẦU" en="STARTS" /></label>
          <input id="startsAt" name="startsAt" type="datetime-local" required className={fieldClass} />
        </FieldCard>
        <FieldCard>
          <label htmlFor="endsAt" className={labelClass}><LocalizedText vi="KẾT THÚC" en="ENDS" /></label>
          <input id="endsAt" name="endsAt" type="datetime-local" required className={fieldClass} />
          {state.fieldErrors?.endsAt?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.endsAt[0], locale)}</p> : null}
        </FieldCard>
      </div>

      <FieldCard tone="bg-yellow">
        <label htmlFor="callTime" className={labelClass}><LocalizedText vi="GIỜ TẬP TRUNG" en="CALL TIME" /></label>
        <input id="callTime" name="callTime" type="datetime-local" className={`${fieldClass} border-0 bg-surface/85`} />
      </FieldCard>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <FieldCard tone="bg-sky">
          <label htmlFor="locationName" className={labelClass}><LocalizedText vi="ĐỊA ĐIỂM" en="LOCATION" /></label>
          <input id="locationName" name="locationName" className={`${fieldClass} border-0 bg-surface/85`} placeholder={locale === "vi" ? "Ví dụ: Studio A" : "Studio A"} />
        </FieldCard>
        <FieldCard tone="bg-sky">
          <label htmlFor="locationAddress" className={labelClass}><LocalizedText vi="ĐỊA CHỈ" en="ADDRESS" /></label>
          <input id="locationAddress" name="locationAddress" className={`${fieldClass} border-0 bg-surface/85`} />
        </FieldCard>
      </div>

      <FieldCard>
        <label htmlFor="notes" className={labelClass}><LocalizedText vi="GHI CHÚ" en="NOTES" /></label>
        <textarea id="notes" name="notes" rows={3} className={fieldClass} placeholder={locale === "vi" ? "Ghi chú ekip, hướng dẫn ra vào, chi tiết sản xuất..." : "Crew notes, access instructions, production details..."} />
      </FieldCard>

      {feedback ? <p className={`rounded-r16 px-4 py-3 text-sm font-bold ${state.ok ? "bg-mint text-ink" : "bg-coral text-error"}`}>{feedback}</p> : null}
      <SubmitButton />
    </form>
  );
}
