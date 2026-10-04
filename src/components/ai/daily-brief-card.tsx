"use client";

import { motion } from "motion/react";
import { Clock, Location, Warning2, MagicStar } from "@/components/ui/iconsax";

export interface DailyBriefShoot {
  id: string;
  title: string;
  status: string;
  time: string;
  location: string;
  crewCount: number;
  gearCount: number;
}

interface DailyBriefCardProps {
  date: string;
  totalShoots: number;
  shoots: DailyBriefShoot[];
  notices: string[];
}

export function DailyBriefCard({ date, totalShoots, shoots, notices }: DailyBriefCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-pink/30 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-stroke/60 bg-pink/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <MagicStar size={18} variant="Bold" className="text-pink" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-ink">
            BẢN TIN SẢN XUẤT HÔM NAY
          </span>
        </div>
        <span className="rounded-pill bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-pink shadow-xs">
          {totalShoots} LỊCH TRÌNH
        </span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-secondary font-medium">{date}</p>

        {/* Shoots schedule list */}
        <div className="space-y-2">
          {shoots.map((s) => (
            <div key={s.id} className="rounded-r14 border border-stroke/50 bg-bg/60 p-2.5 flex items-center justify-between gap-2">
              <div>
                <h4 className="font-display text-xs font-bold text-ink">{s.title}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-secondary">
                  <span className="flex items-center gap-1"><Clock size={12} className="text-pink" /> {s.time}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate max-w-[150px]"><Location size={12} className="text-pink" /> {s.location}</span>
                </div>
              </div>
              <span className="rounded-pill bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink/70">
                {s.status}
              </span>
            </div>
          ))}
        </div>

        {/* Notices */}
        {notices.length > 0 && (
          <div className="rounded-r14 border border-amber-200 bg-amber-50/60 p-3 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Warning2 size={13} className="text-amber-600" />
              Cần chú ý trong ngày:
            </p>
            {notices.map((n, idx) => (
              <p key={idx} className="text-xs text-amber-900/90 pl-3">
                • {n}
              </p>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
