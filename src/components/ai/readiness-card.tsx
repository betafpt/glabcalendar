"use client";

import { motion } from "motion/react";
import { TickCircle, Warning2, TaskSquare } from "@/components/ui/iconsax";
import { ProgressBar } from "@/components/ui/progress-bar";

interface ReadinessCardProps {
  title: string;
  date?: string;
  readinessPercent: number;
  status: string;
  checklistProgress?: string;
  missingRequirements: string[];
}

export function ReadinessCard({
  title,
  date,
  readinessPercent,
  status,
  checklistProgress,
  missingRequirements,
}: ReadinessCardProps) {
  const isHigh = readinessPercent >= 80;
  const isMed = readinessPercent >= 50 && readinessPercent < 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-pink/30 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-stroke/60 bg-pink/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <TaskSquare size={18} variant="Bold" className="text-pink" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-ink">
            ĐỘ SẴN SÀNG SẢN XUẤT
          </span>
        </div>
        <span
          className={`rounded-pill px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-xs ${
            isHigh
              ? "bg-emerald-100 text-emerald-800"
              : isMed
              ? "bg-amber-100 text-amber-800"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {readinessPercent}% READY
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="font-display text-sm font-bold text-ink truncate">{title}</h4>
            {date && <span className="text-[11px] text-secondary font-medium">{date}</span>}
          </div>
          <ProgressBar value={readinessPercent} className="h-2.5" />
          {checklistProgress && (
            <p className="mt-1 text-right text-[10px] text-secondary">
              Checklist hoàn thành: <span className="font-bold text-ink">{checklistProgress}</span>
            </p>
          )}
        </div>

        {/* Missing requirements alerts */}
        {missingRequirements.length > 0 ? (
          <div className="rounded-r14 border border-amber-200/80 bg-amber-50/50 p-2.5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Warning2 size={13} className="text-amber-600" />
              Cần xử lý bổ sung:
            </p>
            <div className="space-y-0.5 pl-4">
              {missingRequirements.map((req, idx) => (
                <p key={idx} className="text-xs text-amber-900/90 font-medium">
                  • {req}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-r14 border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-xs font-semibold text-emerald-800">
            <TickCircle size={16} className="text-emerald-600" />
            <span>Mọi hạng mục quan trọng đã được chuẩn bị đầy đủ!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
