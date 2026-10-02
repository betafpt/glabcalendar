"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { CrewMember } from "@/server/db/schema";
import { fieldClass, labelClass, primaryButtonClass } from "@/components/ui/form-styles";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { createCrewAction, updateCrewAction, type CrewActionState } from "./actions";

const initialState: CrewActionState = { ok: false };

function Submit({ edit }: { edit?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={primaryButtonClass}>{pending ? <LocalizedText vi="Đang lưu..." en="Saving..." /> : edit ? <LocalizedText vi="Lưu thay đổi" en="Save changes" /> : <LocalizedText vi="Thêm thành viên" en="Add crew member" />}</button>;
}

export function CrewForm({ crewMember }: { crewMember?: CrewMember }) {
  const action = crewMember ? updateCrewAction.bind(null, crewMember.id) : createCrewAction;
  const [state, formAction] = useFormState(action, initialState);
  const { locale } = useLanguage();
  const feedback = locale === "vi" ? state.messageVi ?? state.message : state.messageEn ?? state.message;

  return <form action={formAction} className="space-y-5">
    <ImageUploadField name="avatarDataUrl" initialValue={crewMember?.avatarDataUrl} label="ẢNH ĐẠI DIỆN" />
    <div><label htmlFor="name" className={labelClass}><LocalizedText vi="Tên" en="Name" /></label><input id="name" name="name" required defaultValue={crewMember?.name ?? ""} className={fieldClass} />{state.fieldErrors?.name?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.name[0], locale)}</p> : null}</div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="defaultRole" className={labelClass}><LocalizedText vi="Vai trò chính" en="Default role" /></label><input id="defaultRole" name="defaultRole" defaultValue={crewMember?.defaultRole ?? ""} className={fieldClass} /></div><div><label htmlFor="status" className={labelClass}><LocalizedText vi="Trạng thái" en="Status" /></label><select id="status" name="status" defaultValue={crewMember?.status ?? "active"} className={fieldClass}><option value="active"><LocalizedText vi="Đang hoạt động" en="Active" /></option><option value="inactive"><LocalizedText vi="Tạm ngưng" en="Inactive" /></option></select></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="phone" className={labelClass}><LocalizedText vi="Điện thoại" en="Phone" /></label><input id="phone" name="phone" defaultValue={crewMember?.phone ?? ""} className={fieldClass} /></div><div><label htmlFor="email" className={labelClass}>Email</label><input id="email" name="email" type="email" defaultValue={crewMember?.email ?? ""} className={fieldClass} />{state.fieldErrors?.email?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.email[0], locale)}</p> : null}</div></div>
    <div><label htmlFor="notes" className={labelClass}><LocalizedText vi="Ghi chú" en="Notes" /></label><textarea id="notes" name="notes" rows={4} defaultValue={crewMember?.notes ?? ""} className={fieldClass} /></div>
    {feedback ? <p className={`text-sm font-bold ${state.ok ? "text-success" : "text-error"}`}>{feedback}</p> : null}<Submit edit={Boolean(crewMember)} />
  </form>;
}
