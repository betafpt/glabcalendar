"use client";

import { useFormState, useFormStatus } from "react-dom";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { fieldClass, labelClass, primaryButtonClass } from "@/components/ui/form-styles";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { createProjectAction, type ProjectActionState } from "./actions";

const initialState: ProjectActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full sm:w-auto`}>
      {pending ? <LocalizedText vi="Đang tạo..." en="Creating..." /> : <LocalizedText vi="Tạo dự án" en="Create project" />}
    </button>
  );
}

export function ProjectCreateForm() {
  const [state, formAction] = useFormState(createProjectAction, initialState);
  const { locale } = useLanguage();
  const feedback = locale === "vi" ? state.messageVi ?? state.message : state.messageEn ?? state.message;

  return (
    <form action={formAction} className="space-y-5">
      <ImageUploadField name="coverImageUrl" label="ẢNH BÌA DỰ ÁN" />
      <div>
        <label htmlFor="name" className={labelClass}><LocalizedText vi="Tên dự án" en="Project name" /></label>
        <input id="name" name="name" required className={fieldClass} placeholder={locale === "vi" ? "Chiến dịch mùa hè" : "Summer campaign"} />
        {state.fieldErrors?.name?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.name[0], locale)}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="clientName" className={labelClass}><LocalizedText vi="Khách hàng" en="Client" /></label><input id="clientName" name="clientName" className={fieldClass} /></div>
        <div><label htmlFor="status" className={labelClass}><LocalizedText vi="Trạng thái" en="Status" /></label><select id="status" name="status" defaultValue="planned" className={fieldClass}><option value="planned"><LocalizedText vi="Kế hoạch" en="Planned" /></option><option value="active"><LocalizedText vi="Đang thực hiện" en="Active" /></option><option value="completed"><LocalizedText vi="Hoàn thành" en="Completed" /></option><option value="archived"><LocalizedText vi="Lưu trữ" en="Archived" /></option></select></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="startsOn" className={labelClass}><LocalizedText vi="Ngày bắt đầu" en="Start date" /></label><input id="startsOn" name="startsOn" type="date" className={fieldClass} /></div>
        <div><label htmlFor="endsOn" className={labelClass}><LocalizedText vi="Ngày kết thúc" en="End date" /></label><input id="endsOn" name="endsOn" type="date" className={fieldClass} />{state.fieldErrors?.endsOn?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.endsOn[0], locale)}</p> : null}</div>
      </div>

      <div><label htmlFor="notes" className={labelClass}><LocalizedText vi="Ghi chú" en="Notes" /></label><textarea id="notes" name="notes" rows={4} className={fieldClass} /></div>
      {feedback ? <p className={`text-sm font-bold ${state.ok ? "text-success" : "text-error"}`}>{feedback}</p> : null}
      <SubmitButton />
    </form>
  );
}
