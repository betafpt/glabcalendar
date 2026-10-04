"use client";

import { useFormState, useFormStatus } from "react-dom";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { LocalizedText } from "@/components/ui/localized-text";
import { ArrowDown2, Setting2 } from "@/components/ui/iconsax";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/components/language-provider";
import { localizeErrorMessage } from "@/i18n/errors";
import { MapTilerAddressAutocomplete } from "@/components/ui/maptiler-address-autocomplete";
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
        <FieldCard tone="bg-sky">
          <label htmlFor="locationName" className={labelClass}><LocalizedText vi="ĐỊA ĐIỂM" en="LOCATION" /></label>
          <MapTilerAddressAutocomplete
            id="locationName"
            name="locationName"
            required
            placeholder={locale === "vi" ? "Nhập tên địa điểm hoặc địa chỉ..." : "Enter a place or address..."}
            className="border-0 bg-surface/85"
          />
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

      <Accordion type="single" defaultValue="" className="space-y-0">
        <AccordionItem value="advanced" className="overflow-hidden border border-stroke/80 bg-surface/75 shadow-none">
          <AccordionTrigger className="px-4 py-3.5 hover:bg-white/70">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-r14 bg-lilac text-ink">
                <Setting2 size={17} variant="Linear" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[.12em] text-ink">
                  <LocalizedText vi="Thiết lập thêm" en="More settings" />
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-secondary">
                  <LocalizedText vi="Dự án, ghi chú, đồng bộ và dữ liệu test" en="Project, notes, sync and test data" />
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="grid gap-2.5 border-t border-stroke/70 pt-3">
              <FieldCard tone="bg-lilac/65">
                <label htmlFor="projectId" className={labelClass}><LocalizedText vi="DỰ ÁN" en="PROJECT" /></label>
                <StyledSelect id="projectId" name="projectId" defaultValue={defaultProjectId || ""}>
                  <option value=""><LocalizedText vi="Không thuộc dự án" en="No project" /></option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </StyledSelect>
              </FieldCard>

              <FieldCard>
                <label htmlFor="notes" className={labelClass}><LocalizedText vi="GHI CHÚ" en="NOTES" /></label>
                <textarea id="notes" name="notes" rows={3} className={fieldClass} placeholder={locale === "vi" ? "Ghi chú ekip, hướng dẫn ra vào, chi tiết sản xuất..." : "Crew notes, access instructions, production details..."} />
              </FieldCard>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {feedback ? <p className={`rounded-r16 px-4 py-3 text-sm font-bold ${state.ok ? "bg-mint text-ink" : "bg-coral text-error"}`}>{feedback}</p> : null}
      <SubmitButton />
    </form>
  );
}
