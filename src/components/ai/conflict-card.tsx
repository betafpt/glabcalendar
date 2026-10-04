"use client";

import { motion } from "motion/react";
import { Warning2, Profile2User, Camera } from "@/components/ui/iconsax";

export interface ConflictItemData {
  type: "crew" | "equipment";
  targetName: string;
  conflictingShootTitle?: string;
  timeRange?: string;
}

interface ConflictCardProps {
  totalConflicts: number;
  conflicts: ConflictItemData[];
}

export function ConflictCard({ totalConflicts, conflicts }: ConflictCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-amber-300/60 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-amber-700">
          <Warning2 size={18} variant="Bold" className="text-amber-600" />
          <span className="font-display text-sm font-black uppercase tracking-wider">
            {totalConflicts} XUNG ĐỘT PHÁT HIỆN
          </span>
        </div>
        <span className="rounded-pill bg-amber-200/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
          Cần xử lý
        </span>
      </div>

      <div className="divide-y divide-stroke/40 p-2">
        {conflicts.length === 0 ? (
          <p className="p-4 text-center text-xs text-secondary">
            ✓ Không có xung đột nào được phát hiện.
          </p>
        ) : (
          conflicts.map((c, idx) => (
            <div key={idx} className="flex flex-col gap-1 p-2.5 rounded-r14 hover:bg-amber-50/30 transition">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-amber-100 text-amber-800 shrink-0">
                  {c.type === "crew" ? <Profile2User size={13} /> : <Camera size={13} />}
                </span>
                <span className="font-display text-xs font-bold text-ink">
                  {c.targetName}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-600 ml-auto">
                  {c.type === "crew" ? "Nhân sự" : "Thiết bị"}
                </span>
              </div>
              <div className="ml-8 text-[11px] text-secondary">
                {c.conflictingShootTitle && (
                  <p className="font-medium text-ink/80">Trùng với: {c.conflictingShootTitle}</p>
                )}
                {c.timeRange && (
                  <p className="text-amber-700/80 font-medium">Khung giờ: {c.timeRange}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
