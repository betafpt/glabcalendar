"use client";

import React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { EquipmentBooking } from "@/server/db/schema";
import type { ShootEquipmentOption } from "@/server/shoot-detail-options";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Box, Warning2 } from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { Badge } from "@/components/ui/badge";
import { ConflictList } from "@/components/scheduling/conflict-list";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { useLanguage } from "@/components/language-provider";
import {
  bookEquipmentAction,
  removeEquipmentBookingAction,
  type ResourceActionState,
} from "./resource-actions";

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

export function EquipmentBookingSection({
  shootId,
  equipment,
  equipmentBookings,
  conflictCount = 0,
  canManage,
}: {
  shootId: string;
  equipment: ShootEquipmentOption[];
  equipmentBookings: EquipmentRow[];
  conflictCount?: number;
  canManage: boolean;
}) {
  const { locale } = useLanguage();
  const [equipmentState, equipmentAction] = useFormState(
    bookEquipmentAction.bind(null, shootId),
    initialState
  );
  const equipmentFeedback =
    locale === "vi"
      ? equipmentState.messageVi ?? equipmentState.message
      : equipmentState.messageEn ?? equipmentState.message;

  const hasConflicts = conflictCount > 0 || Boolean(equipmentState.conflicts?.length);
  const isInventoryEmpty = equipment.length === 0;

  // Tóm tắt các thiết bị chính
  const mainGearNames = equipmentBookings.slice(0, 3).map((b) => b.equipmentItem.name);
  const totalQuantity = equipmentBookings.reduce((sum, b) => sum + (b.booking.quantity || 1), 0);

  return (
    <AccordionItem
      value="gear"
      className="overflow-hidden border border-stroke/90 bg-sky/20 transition-all duration-200"
    >
      <AccordionTrigger className="p-4 sm:p-5 hover:bg-black/[0.02]">
        <div className="flex flex-col gap-3">
          {/* Top Row: Icon + Section Title + Count & Conflict Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-r14 bg-sky/50 text-ink">
                <Box size={18} variant="Linear" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-secondary">
                  <LocalizedText vi="THIẾT BỊ" en="GEAR" />
                </p>
                <h3 className="font-display text-lg sm:text-xl font-black uppercase leading-tight tracking-tight text-ink">
                  <LocalizedText vi="Đặt thiết bị" en="Book gear" />
                  <span className="text-pink">*</span>
                </h3>
              </div>
            </div>

            {/* Badges / Alerts */}
            <div className="flex flex-wrap items-center gap-2">
              {hasConflicts ? (
                <Badge variant="coral" className="gap-1 border-error/30 bg-coral text-error shadow-sm font-black animate-pulse">
                  <Warning2 size={13} variant="Bold" />
                  <LocalizedText vi="Đụng lịch gear" en="Gear conflict" />
                </Badge>
              ) : null}

              {isInventoryEmpty ? (
                <Badge variant="yellow" className="gap-1">
                  <Warning2 size={12} variant="Bold" />
                  <LocalizedText vi="Kho thiết bị trống" en="Empty inventory" />
                </Badge>
              ) : equipmentBookings.length > 0 ? (
                <Badge variant="outline" className="bg-surface font-black text-ink">
                  {equipmentBookings.length} <LocalizedText vi="mục" en="items" /> ({totalQuantity} <LocalizedText vi="món" en="units" />)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-secondary bg-surface">
                  <LocalizedText vi="Chưa đặt thiết bị" en="No gear booked" />
                </Badge>
              )}
            </div>
          </div>

          {/* Summary Details Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-secondary">
            {equipmentBookings.length > 0 ? (
              <div className="flex items-center gap-2 truncate">
                <Box size={15} variant="Linear" className="shrink-0 text-ink/70" />
                <span className="font-bold text-ink truncate">
                  {mainGearNames.join(", ")}
                  {equipmentBookings.length > 3 ? "..." : ""}
                </span>
              </div>
            ) : (
              <p className="text-secondary italic">
                <LocalizedText vi="Chưa đặt thiết bị" en="No gear booked yet" />
              </p>
            )}

            {/* Summary quantity */}
            {equipmentBookings.length > 0 ? (
              <span className="text-[11px] text-secondary/80">
                <LocalizedText vi="Tổng số lượng:" en="Total qty:" />{" "}
                <strong className="text-ink">{totalQuantity}</strong>
              </span>
            ) : null}
          </div>
        </div>
      </AccordionTrigger>

      {/* Expanded Content: Form & List */}
      <AccordionContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="border-t border-stroke/70 pt-4 space-y-4">
          {canManage && isInventoryEmpty ? (
            <div className="rounded-r22 border border-dashed border-stroke bg-surface/90 p-5 text-center shadow-soft">
              <p className="text-xs font-bold text-secondary">
                <LocalizedText
                  vi="Kho thiết bị hiện đang trống hoặc chưa có thiết bị nào."
                  en="Equipment inventory is currently empty."
                />
              </p>
              <p className="mt-1 text-[11px] font-medium text-secondary/80">
                <LocalizedText
                  vi="Vui lòng thêm thiết bị vào kho trước khi tiến hành đặt cho buổi quay."
                  en="Please add gear to your equipment library before booking for a shoot."
                />
              </p>
              <Link
                href="/equipment"
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white shadow-soft transition hover:bg-pink active:scale-press"
              >
                + <LocalizedText vi="Đến kho thiết bị" en="Go to Equipment Library" />
              </Link>
            </div>
          ) : canManage ? (
            <form
              action={equipmentAction}
              className="space-y-3 rounded-r22 bg-surface/95 p-4 shadow-soft border border-stroke/70"
            >
              <div>
                <label htmlFor="equipment-item" className={labelClass}>
                  <LocalizedText vi="Thiết bị" en="Gear item" />
                </label>
                <select
                  id="equipment-item"
                  name="equipmentItemId"
                  required
                  className={`${fieldClass} border-0 bg-white`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {locale === "vi" ? "Chọn thiết bị" : "Select gear"}
                  </option>
                  {equipment
                    .filter((item) => item.status === "available")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.assetCode ? ` — ${item.assetCode}` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label htmlFor="equipment-notes" className={labelClass}>
                    <LocalizedText vi="Ghi chú" en="Notes" />
                  </label>
                  <input
                    id="equipment-notes"
                    name="notes"
                    placeholder={
                      locale === "vi" ? "Ống kính, phụ kiện kèm theo..." : "Lenses, accessories..."
                    }
                    className={`${fieldClass} border-0 bg-white`}
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="equipment-quantity" className={labelClass}>
                    <LocalizedText vi="Số lượng" en="Qty" />
                  </label>
                  <input
                    id="equipment-quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className={`${fieldClass} border-0 bg-white text-center font-bold`}
                  />
                </div>
              </div>
              <SubmitButton vi="Đặt thiết bị →" en="Book gear →" />
              {equipmentFeedback ? (
                <p
                  className={`rounded-r16 px-3 py-2 text-xs font-bold ${
                    equipmentState.ok ? "bg-mint text-ink" : "bg-coral text-error"
                  }`}
                >
                  {equipmentFeedback}
                </p>
              ) : null}
              <ConflictList conflicts={equipmentState.conflicts} />
            </form>
          ) : (
            <div className="rounded-r20 border border-dashed border-stroke bg-surface/80 p-4 text-xs font-semibold text-secondary">
              <LocalizedText vi="Bạn đang xem lịch do tài khoản khác tạo nên không thể đặt hoặc gỡ thiết bị." en="You are viewing a shoot created by another account, so equipment is read-only." />
            </div>
          )}

          {/* Booked Equipment List */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-[.15em] text-secondary">
              <LocalizedText vi="Danh sách thiết bị đã đặt" en="Booked Gear List" /> (
              {equipmentBookings.length})
            </h4>
            {equipmentBookings.length ? (
              equipmentBookings.map(({ booking, equipmentItem }) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between gap-3 rounded-r22 border border-ink/5 bg-surface/90 p-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{equipmentItem.name}</p>
                    <p className="text-xs font-semibold text-secondary">
                      <LocalizedText vi="Số lượng:" en="Qty:" />{" "}
                      <span className="font-black text-ink">{booking.quantity}</span>
                      {equipmentItem.assetCode ? ` · ${equipmentItem.assetCode}` : ""}
                    </p>
                    {booking.notes ? (
                      <p className="truncate text-[11px] text-secondary/70 italic">
                        {booking.notes}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? <form
                    action={removeEquipmentBookingAction.bind(null, shootId, booking.id)}
                  >
                    <button
                      type="submit"
                      className="min-h-11 rounded-pill border border-error/20 bg-white px-4 text-xs font-black text-error transition hover:bg-error hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-press"
                    >
                      <LocalizedText vi="Xóa" en="Remove" />
                    </button>
                  </form> : null}
                </div>
              ))
            ) : (
              <p className="rounded-r22 border border-dashed border-ink/10 bg-surface/70 p-4 text-center text-xs font-semibold text-secondary">
                <LocalizedText vi="Chưa đặt thiết bị." en="No gear booked yet." />
              </p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
