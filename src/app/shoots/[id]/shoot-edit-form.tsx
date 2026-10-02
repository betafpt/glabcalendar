"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Shoot } from "@/server/db/schema";
import type { ShootProjectOption } from "@/server/shoot-detail-options";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { formatDateTimeLocal } from "@/lib/zoned-datetime";
import { updateShootAction, type ShootActionState } from "../actions";

const initialState: ShootActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-pill bg-ink px-6 text-sm font-black uppercase tracking-[.12em] text-white transition duration-fast hover:bg-pink active:scale-press disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <LocalizedText vi="ĐANG LƯU..." en="SAVING..." /> : <LocalizedText vi="LƯU THAY ĐỔI →" en="SAVE CHANGES →" />}
    </button>
  );
}

function FieldCard({ children, tone = "bg-bg" }: { children: React.ReactNode; tone?: string }) {
  return <div className={`rounded-r22 p-3.5 ${tone}`}>{children}</div>;
}

export function ShootEditForm({ shoot, projects, timezone }: { shoot: Shoot; projects: ShootProjectOption[]; timezone: string }) {
  const [state, formAction] = useFormState(updateShootAction.bind(null, shoot.id), initialState);
  const { locale } = useLanguage();
  const feedback = locale === "vi" ? state.messageVi ?? state.message : state.messageEn ?? state.message;

  return (
    <form action={formAction} className="space-y-3">
      <FieldCard tone="bg-coral">
        <label htmlFor="edit-title" className={labelClass}>
          <LocalizedText vi="TÊN BUỔI QUAY" en="SHOOT TITLE" />
        </label>
        <input
          id="edit-title"
          name="title"
          defaultValue={shoot.title}
          required
          className={`${fieldClass} border-0 bg-surface/85 text-base`}
        />
        {state.fieldErrors?.title?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.title[0], locale)}</p> : null}
      </FieldCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldCard tone="bg-lilac">
          <label htmlFor="edit-projectId" className={labelClass}>
            <LocalizedText vi="DỰ ÁN" en="PROJECT" />
          </label>
          <select id="edit-projectId" name="projectId" defaultValue={shoot.projectId ?? ""} className={`${fieldClass} border-0 bg-surface/85`}>
            <option value=""><LocalizedText vi="Không thuộc dự án" en="No project" /></option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </FieldCard>
        <FieldCard tone="bg-mint">
          <label htmlFor="edit-status" className={labelClass}>
            <LocalizedText vi="TRẠNG THÁI" en="STATUS" />
          </label>
          <select id="edit-status" name="status" defaultValue={shoot.status} className={`${fieldClass} border-0 bg-surface/85`}>
            <option value="planned"><LocalizedText vi="Kế hoạch" en="Planned" /></option>
            <option value="confirmed"><LocalizedText vi="Đã xác nhận" en="Confirmed" /></option>
            <option value="in_progress"><LocalizedText vi="Đang diễn ra" en="In progress" /></option>
            <option value="completed"><LocalizedText vi="Hoàn thành" en="Completed" /></option>
            <option value="cancelled"><LocalizedText vi="Đã hủy" en="Cancelled" /></option>
          </select>
        </FieldCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldCard>
          <label htmlFor="edit-startsAt" className={labelClass}>
            <LocalizedText vi="BẮT ĐẦU" en="STARTS" />
          </label>
          <input
            id="edit-startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={formatDateTimeLocal(shoot.startsAt, timezone)}
            required
            className={fieldClass}
          />
        </FieldCard>
        <FieldCard>
          <label htmlFor="edit-endsAt" className={labelClass}>
            <LocalizedText vi="KẾT THÚC" en="ENDS" />
          </label>
          <input
            id="edit-endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={formatDateTimeLocal(shoot.endsAt, timezone)}
            required
            className={fieldClass}
          />
          {state.fieldErrors?.endsAt?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.endsAt[0], locale)}</p> : null}
        </FieldCard>
      </div>

      <FieldCard tone="bg-yellow">
        <label htmlFor="edit-callTime" className={labelClass}><LocalizedText vi="GIỜ TẬP TRUNG" en="CALL TIME" /></label>
        <input
          id="edit-callTime"
          name="callTime"
          type="datetime-local"
          defaultValue={formatDateTimeLocal(shoot.callTime, timezone)}
          className={`${fieldClass} border-0 bg-surface/85`}
        />
      </FieldCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldCard tone="bg-sky">
          <label htmlFor="edit-locationName" className={labelClass}>
            <LocalizedText vi="ĐỊA ĐIỂM" en="LOCATION" />
          </label>
          <input
            id="edit-locationName"
            name="locationName"
            defaultValue={shoot.locationName ?? ""}
            className={`${fieldClass} border-0 bg-surface/85`}
            placeholder={locale === "vi" ? "Ví dụ: Studio A" : "Studio A"}
          />
        </FieldCard>
        <FieldCard tone="bg-sky">
          <label htmlFor="edit-locationAddress" className={labelClass}>
            <LocalizedText vi="ĐỊA CHỈ" en="ADDRESS" />
          </label>
          <input
            id="edit-locationAddress"
            name="locationAddress"
            defaultValue={shoot.locationAddress ?? ""}
            className={`${fieldClass} border-0 bg-surface/85`}
          />
        </FieldCard>
      </div>

      <FieldCard>
        <label htmlFor="edit-notes" className={labelClass}>
          <LocalizedText vi="GHI CHÚ" en="NOTES" />
        </label>
        <textarea
          id="edit-notes"
          name="notes"
          rows={3}
          defaultValue={shoot.notes ?? ""}
          className={fieldClass}
          placeholder={locale === "vi" ? "Ghi chú ekip, hướng dẫn ra vào, chi tiết sản xuất..." : "Crew notes, access instructions, production details..."}
        />
      </FieldCard>

      {feedback ? (
        <p className={`rounded-r16 px-4 py-3 text-sm font-bold ${state.ok ? "bg-mint text-ink" : "bg-coral text-error"}`}>
          {feedback}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
