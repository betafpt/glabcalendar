"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { EquipmentBooking, ShootCrewAssignment } from "@/server/db/schema";
import type { ShootCrewOption, ShootEquipmentOption } from "@/server/shoot-detail-options";
import { ConflictList } from "@/components/scheduling/conflict-list";
import { Avatar } from "@/components/ui/avatar";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { assignCrewAction, bookEquipmentAction, removeCrewAssignmentAction, removeEquipmentBookingAction, type ResourceActionState } from "./resource-actions";

type CrewRow = { assignment: ShootCrewAssignment; crewMember: ShootCrewOption };
type EquipmentRow = { booking: EquipmentBooking; equipmentItem: ShootEquipmentOption };
const initialState: ResourceActionState = { ok: false };

function SubmitButton({ vi, en }: { vi: string; en: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-[.1em] text-white transition duration-fast hover:bg-pink active:scale-press disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <LocalizedText vi="ĐANG LƯU..." en="SAVING..." /> : <LocalizedText vi={vi} en={en} />}
    </button>
  );
}

export function ResourceScheduling({
  shootId,
  crew,
  equipment,
  crewAssignments,
  equipmentBookings,
}: {
  shootId: string;
  crew: ShootCrewOption[];
  equipment: ShootEquipmentOption[];
  crewAssignments: CrewRow[];
  equipmentBookings: EquipmentRow[];
}) {
  const { locale } = useLanguage();
  const [crewState, crewAction] = useFormState(assignCrewAction.bind(null, shootId), initialState);
  const [equipmentState, equipmentAction] = useFormState(bookEquipmentAction.bind(null, shootId), initialState);
  const crewFeedback = locale === "vi" ? crewState.messageVi ?? crewState.message : crewState.messageEn ?? crewState.message;
  const equipmentFeedback = locale === "vi" ? equipmentState.messageVi ?? equipmentState.message : equipmentState.messageEn ?? equipmentState.message;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-r28 border border-stroke bg-coral p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-secondary">
            <LocalizedText vi="NHÂN SỰ" en="CREW" />
          </p>
          <span className="rounded-pill bg-white/50 px-2.5 py-1 text-[10px] font-black uppercase text-secondary">
            {crewAssignments.length} <LocalizedText vi="thành viên" en="assigned" />
          </span>
        </div>
        <h2 className="mt-1 font-display text-[clamp(1.8rem,5vw,2.5rem)] font-black uppercase leading-[.88] tracking-[-.04em]">
          <LocalizedText vi="Phân công ekip" en="Assign crew" /><span className="text-pink">*</span>
        </h2>
        <form action={crewAction} className="mt-4 space-y-3 rounded-r22 bg-surface/90 p-4 shadow-soft">
          <div>
            <label htmlFor="crew-member" className={labelClass}>
              <LocalizedText vi="Thành viên" en="Crew member" />
            </label>
            <select id="crew-member" name="crewMemberId" required className={`${fieldClass} border-0 bg-white`} defaultValue="">
              <option value="" disabled>{locale === "vi" ? "Chọn thành viên ekip" : "Select crew member"}</option>
              {crew.filter((member) => member.status === "active").map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}{member.defaultRole ? ` — ${member.defaultRole}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="crew-role" className={labelClass}>
              <LocalizedText vi="Vai trò" en="Role" />
            </label>
            <input id="crew-role" name="role" placeholder={locale === "vi" ? "Đạo diễn hình ảnh (DOP)..." : "Director of Photography"} className={`${fieldClass} border-0 bg-white`} />
          </div>
          <div>
            <label htmlFor="crew-notes" className={labelClass}>
              <LocalizedText vi="Ghi chú" en="Notes" />
            </label>
            <input id="crew-notes" name="notes" placeholder={locale === "vi" ? "Ghi chú phân công..." : "Assignment notes..."} className={`${fieldClass} border-0 bg-white`} />
          </div>
          <SubmitButton vi="Phân công ekip →" en="Assign crew →" />
          {crewFeedback ? (
            <p className={`rounded-r16 px-3 py-2 text-xs font-bold ${crewState.ok ? "bg-mint text-ink" : "bg-coral text-error"}`}>
              {crewFeedback}
            </p>
          ) : null}
          <ConflictList conflicts={crewState.conflicts} />
        </form>
        <div className="mt-4 space-y-2">
          {crewAssignments.length ? (
            crewAssignments.map(({ assignment, crewMember }) => (
              <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-r22 border border-ink/5 bg-surface/85 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={crewMember.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{crewMember.name}</p>
                    <p className="truncate text-xs font-semibold text-secondary">{assignment.role || crewMember.defaultRole || (locale === "vi" ? "Nhân sự" : "Crew")}</p>
                  </div>
                </div>
                <form action={removeCrewAssignmentAction.bind(null, shootId, assignment.id)}>
                  <button type="submit" className="min-h-11 rounded-pill border border-error/20 bg-white px-4 text-xs font-black text-error transition hover:bg-error hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-press">
                    <LocalizedText vi="Xóa" en="Remove" />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-r22 border border-dashed border-ink/10 bg-surface/70 p-4 text-center text-xs font-semibold text-secondary">
              <LocalizedText vi="Chưa phân công ekip." en="No crew assigned yet." />
            </p>
          )}
        </div>
      </section>

      <section className="rounded-r28 border border-stroke bg-sky p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-secondary">
            <LocalizedText vi="THIẾT BỊ" en="GEAR" />
          </p>
          <span className="rounded-pill bg-white/50 px-2.5 py-1 text-[10px] font-black uppercase text-secondary">
            {equipmentBookings.length} <LocalizedText vi="thiết bị" en="booked" />
          </span>
        </div>
        <h2 className="mt-1 font-display text-[clamp(1.8rem,5vw,2.5rem)] font-black uppercase leading-[.88] tracking-[-.04em]">
          <LocalizedText vi="Đặt thiết bị" en="Book gear" /><span className="text-pink">*</span>
        </h2>
        <form action={equipmentAction} className="mt-4 space-y-3 rounded-r22 bg-surface/90 p-4 shadow-soft">
          <div>
            <label htmlFor="equipment-item" className={labelClass}>
              <LocalizedText vi="Thiết bị" en="Gear item" />
            </label>
            <select id="equipment-item" name="equipmentItemId" required className={`${fieldClass} border-0 bg-white`} defaultValue="">
              <option value="" disabled>{locale === "vi" ? "Chọn thiết bị" : "Select gear"}</option>
              {equipment.filter((item) => item.status === "available").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.assetCode ? ` — ${item.assetCode}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label htmlFor="equipment-notes" className={labelClass}>
                <LocalizedText vi="Ghi chú" en="Notes" />
              </label>
              <input id="equipment-notes" name="notes" placeholder={locale === "vi" ? "Ống kính, phụ kiện kèm theo..." : "Lenses, accessories..."} className={`${fieldClass} border-0 bg-white`} />
            </div>
            <div className="w-24">
              <label htmlFor="equipment-quantity" className={labelClass}>
                <LocalizedText vi="Số lượng" en="Qty" />
              </label>
              <input id="equipment-quantity" name="quantity" type="number" min={1} defaultValue={1} className={`${fieldClass} border-0 bg-white text-center`} />
            </div>
          </div>
          <SubmitButton vi="Đặt thiết bị →" en="Book gear →" />
          {equipmentFeedback ? (
            <p className={`rounded-r16 px-3 py-2 text-xs font-bold ${equipmentState.ok ? "bg-mint text-ink" : "bg-coral text-error"}`}>
              {equipmentFeedback}
            </p>
          ) : null}
          <ConflictList conflicts={equipmentState.conflicts} />
        </form>
        <div className="mt-4 space-y-2">
          {equipmentBookings.length ? (
            equipmentBookings.map(({ booking, equipmentItem }) => (
              <div key={booking.id} className="flex items-center justify-between gap-3 rounded-r22 border border-ink/5 bg-surface/85 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{equipmentItem.name}</p>
                  <p className="text-xs font-semibold text-secondary">
                    <LocalizedText vi="Số lượng:" en="Qty:" /> <span className="font-black text-ink">{booking.quantity}</span>
                    {equipmentItem.assetCode ? ` · ${equipmentItem.assetCode}` : ""}
                  </p>
                </div>
                <form action={removeEquipmentBookingAction.bind(null, shootId, booking.id)}>
                  <button type="submit" className="min-h-11 rounded-pill border border-error/20 bg-white px-4 text-xs font-black text-error transition hover:bg-error hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-press">
                    <LocalizedText vi="Xóa" en="Remove" />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-r22 border border-dashed border-ink/10 bg-surface/70 p-4 text-center text-xs font-semibold text-secondary">
              <LocalizedText vi="Chưa đặt thiết bị." en="No gear booked yet." />
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
