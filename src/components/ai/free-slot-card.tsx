"use client";

import { motion } from "motion/react";
import { Clock, AddCircle } from "@/components/ui/iconsax";

export interface FreeSlotItem {
  date: string;
  dayOfWeek?: string;
  start: string;
  end: string;
  durationHours: number;
}

interface FreeSlotCardProps {
  slots: FreeSlotItem[];
  onSelectSlot?: (slot: FreeSlotItem) => void;
}

export function FreeSlotCard({ slots, onSelectSlot }: FreeSlotCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-emerald-300/60 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-emerald-800">
          <Clock size={18} variant="Bold" className="text-emerald-600" />
          <span className="font-display text-sm font-black uppercase tracking-wider">
            TÌM THẤY {slots.length} KHUNG GIỜ TRỐNG
          </span>
        </div>
        <span className="rounded-pill bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
          Khả dụng
        </span>
      </div>

      <div className="divide-y divide-stroke/40 p-2">
        {slots.length === 0 ? (
          <p className="p-4 text-center text-xs text-secondary">
            Không tìm thấy khung giờ trống phù hợp với yêu cầu thời lượng.
          </p>
        ) : (
          slots.map((slot, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-2.5 rounded-r14 hover:bg-emerald-50/30 transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold text-ink">
                    {slot.dayOfWeek ? `${slot.dayOfWeek}, ${slot.date}` : slot.date}
                  </span>
                  <span className="rounded-pill bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {slot.durationHours} tiếng
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-secondary font-medium">
                  {slot.start} – {slot.end}
                </p>
              </div>

              {onSelectSlot && (
                <button
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className="flex items-center gap-1 rounded-pill bg-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-soft transition hover:bg-pink hover:text-ink active:scale-press"
                >
                  <AddCircle size={14} />
                  <span>Tạo lịch</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
