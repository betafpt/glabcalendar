"use client";

import { motion } from "motion/react";
import { Clock, Location, Calendar } from "@/components/ui/iconsax";

export interface ScheduleEventItem {
  id: string;
  title: string;
  status: string;
  timeRange: string;
  location: string;
  project?: string;
}

interface ScheduleSummaryCardProps {
  dateLabel?: string;
  totalEvents: number;
  events: ScheduleEventItem[];
}

export function ScheduleSummaryCard({ dateLabel = "HÔM NAY", totalEvents, events }: ScheduleSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-r22 border border-pink/30 bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-stroke/60 bg-pink/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} variant="Bold" className="text-pink" />
          <span className="font-display text-sm font-black uppercase tracking-wider text-ink">
            {dateLabel}
          </span>
        </div>
        <span className="rounded-pill bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-pink shadow-xs">
          {totalEvents} {totalEvents === 1 ? "buổi" : "buổi quay"}
        </span>
      </div>

      <div className="divide-y divide-stroke/40 p-2">
        {events.length === 0 ? (
          <p className="p-4 text-center text-xs text-secondary">
            Không có lịch quay nào được ghi nhận trong khoảng thời gian này.
          </p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex flex-col gap-1 p-2.5 transition hover:bg-bg/60 rounded-r14">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold text-ink truncate">
                  {ev.title}
                </span>
                <span className="shrink-0 rounded-pill bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/70">
                  {ev.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-secondary">
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-pink" />
                  {ev.timeRange}
                </span>
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <Location size={13} className="text-pink" />
                  {ev.location}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
