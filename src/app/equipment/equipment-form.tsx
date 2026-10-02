"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { EquipmentItem } from "@/server/db/schema";
import { fieldClass, labelClass, primaryButtonClass } from "@/components/ui/form-styles";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { createEquipmentAction, updateEquipmentAction, type EquipmentActionState } from "./actions";

const initialState: EquipmentActionState = { ok: false };

function Submit({ edit }: { edit?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={primaryButtonClass}>{pending ? <LocalizedText vi="Đang lưu..." en="Saving..." /> : edit ? <LocalizedText vi="Lưu thay đổi" en="Save changes" /> : <LocalizedText vi="Thêm thiết bị" en="Add gear" />}</button>;
}

export function EquipmentForm({ item }: { item?: EquipmentItem }) {
  const action = item ? updateEquipmentAction.bind(null, item.id) : createEquipmentAction;
  const [state, formAction] = useFormState(action, initialState);
  const { locale } = useLanguage();
  const feedback = locale === "vi" ? state.messageVi ?? state.message : state.messageEn ?? state.message;

  return <form action={formAction} className="space-y-5">
    <ImageUploadField name="imageDataUrl" initialValue={item?.imageDataUrl} label="ẢNH THIẾT BỊ" />
    <div><label htmlFor="name" className={labelClass}><LocalizedText vi="Tên thiết bị" en="Gear name" /></label><input id="name" name="name" required defaultValue={item?.name ?? ""} className={fieldClass} />{state.fieldErrors?.name?.[0] ? <p className="mt-1 text-xs font-bold text-error">{localizeErrorMessage(state.fieldErrors.name[0], locale)}</p> : null}</div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="category" className={labelClass}><LocalizedText vi="Danh mục" en="Category" /></label><input id="category" name="category" defaultValue={item?.category ?? ""} className={fieldClass} /></div><div><label htmlFor="status" className={labelClass}><LocalizedText vi="Trạng thái" en="Status" /></label><select id="status" name="status" defaultValue={item?.status ?? "available"} className={fieldClass}><option value="available"><LocalizedText vi="Sẵn sàng" en="Available" /></option><option value="maintenance"><LocalizedText vi="Bảo trì" en="Maintenance" /></option><option value="retired"><LocalizedText vi="Ngừng sử dụng" en="Retired" /></option></select></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="assetCode" className={labelClass}><LocalizedText vi="Mã tài sản" en="Asset code" /></label><input id="assetCode" name="assetCode" defaultValue={item?.assetCode ?? ""} className={fieldClass} /></div><div><label htmlFor="serialNumber" className={labelClass}><LocalizedText vi="Số serial" en="Serial number" /></label><input id="serialNumber" name="serialNumber" defaultValue={item?.serialNumber ?? ""} className={fieldClass} /></div></div>
    <div><label htmlFor="notes" className={labelClass}><LocalizedText vi="Ghi chú" en="Notes" /></label><textarea id="notes" name="notes" rows={4} defaultValue={item?.notes ?? ""} className={fieldClass} /></div>
    {feedback ? <p className={`text-sm font-bold ${state.ok ? "text-success" : "text-error"}`}>{feedback}</p> : null}<Submit edit={Boolean(item)} />
  </form>;
}
