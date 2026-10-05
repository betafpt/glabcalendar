"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft2,
  ArrowRight2,
  ArrowDown2,
  ArrowUp2,
  TickCircle,
  Clock,
  Location,
  Add,
} from "@/components/ui/iconsax";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";

export type ContextPanelShoot = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  locationName?: string | null;
  locationAddress?: string | null;
  projectName?: string;
  crewCount?: number;
};

export type ContextPanelAttention = {
  totalConflicts: number;
  conflictsList: Array<{ shootTitle: string; note: string }>;
  pendingChecklistCount: number;
  checklistItems: Array<{ id: string; title: string; shootTitle: string; completed: boolean }>;
};

type CalendarContextPanelProps = {
  currentAnchor: Date;
  selectedDate: Date;
  timezone: string;
  shoots: ContextPanelShoot[];
  attentionData: ContextPanelAttention;
  cleanParams: Record<string, string | undefined>;
};

function formatDisplayTime(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function CalendarContextPanel({
  selectedDate,
  timezone,
  shoots,
  attentionData,
  cleanParams,
}: CalendarContextPanelProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Mini calendar month browsing state
  const [browsingMonth, setBrowsingMonth] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  // Accordion details toggle states (Default collapsed, showing summary cards of ~80-120px)
  const [todayDetailsOpen, setTodayDetailsOpen] = useState(false);
  const [attentionDetailsOpen, setAttentionDetailsOpen] = useState(false);

  // Calculate days for mini calendar
  const year = browsingMonth.getFullYear();
  const month = browsingMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday = 0 in our grid
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const miniDays: Array<{
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    hasShoots: boolean;
  }> = [];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  // Build shoots date lookup map
  const shootDatesSet = new Set(
    shoots.map((s) => {
      const d = new Date(s.startsAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    miniDays.push({
      date: d,
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
      hasShoots: shootDatesSet.has(dateStr),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    miniDays.push({
      date: d,
      dayNum: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
      hasShoots: shootDatesSet.has(dateStr),
    });
  }

  // Next month leading days to complete grid
  const remainingDays = (7 - (miniDays.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    miniDays.push({
      date: d,
      dayNum: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
      hasShoots: shootDatesSet.has(dateStr),
    });
  }

  const handleSelectDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const query = new URLSearchParams();
    query.set("view", cleanParams.view || "week");
    query.set("date", dateStr);
    for (const [k, v] of Object.entries(cleanParams)) {
      if (v && k !== "date" && k !== "view") query.set(k, v);
    }
    router.push(`/calendar?${query.toString()}`, { scroll: false });
  };

  const handlePrevMonth = () => {
    setBrowsingMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setBrowsingMonth(new Date(year, month + 1, 1));
  };

  const monthName = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(browsingMonth);

  // Find nearest shoot or today's shoot
  const todayShoots = shoots.filter((s) => {
    const d = new Date(s.startsAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === todayStr;
  });

  const displayShoot = todayShoots[0];
  const weekHeaders = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <aside className="w-full space-y-4 shrink-0">
      {/* 1. MINI CALENDAR CARD (Kích thước fluid ~340–380px ở desktop) */}
      <div className="w-full rounded-[24px] border border-black/[0.05] bg-white/70 p-4 sm:p-5 shadow-none backdrop-blur-sm transition-all duration-fast">
        {/* Month Title & Prev/Next Arrow Buttons */}
        <div className="flex items-center justify-between gap-1 pb-3 border-b border-black/[0.04]">
          <p className="font-display text-sm sm:text-base font-black capitalize tracking-tight text-ink">
            {monthName}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              className="grid size-7 place-items-center rounded-full text-secondary hover:bg-black/[0.04] hover:text-ink active:scale-95 transition-all"
            >
              <ArrowLeft2 size={13} variant="Linear" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Tháng sau"
              className="grid size-7 place-items-center rounded-full text-secondary hover:bg-black/[0.04] hover:text-ink active:scale-95 transition-all"
            >
              <ArrowRight2 size={13} variant="Linear" />
            </button>
          </div>
        </div>

        {/* Weekday Row (T2 - CN) */}
        <div className="mt-3 grid grid-cols-7 text-center">
          {weekHeaders.map((h, i) => (
            <span
              key={h}
              className={cn(
                "text-[10px] font-black uppercase tracking-wider py-1",
                i >= 5 ? "text-pink" : "text-secondary/70"
              )}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="mt-1.5 grid grid-cols-7 gap-y-1.5 text-center">
          {miniDays.map((item, index) => {
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectDate(item.date)}
                className={cn(
                  "relative mx-auto grid size-8 place-items-center rounded-full text-xs font-bold transition-all duration-fast active:scale-90",
                  item.isSelected
                    ? "bg-[#D7F994] font-black text-ink shadow-xs ring-2 ring-[#BBE86B]/60 scale-105"
                    : item.isToday
                    ? "border border-pink text-pink font-black"
                    : item.isCurrentMonth
                    ? "text-ink hover:bg-black/[0.04] hover:text-pink"
                    : "text-secondary/35 hover:text-secondary"
                )}
              >
                <span>{item.dayNum}</span>
                {item.hasShoots && !item.isSelected ? (
                  <span className="absolute bottom-1 size-1 rounded-full bg-pink" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MODULE "LỊCH QUAY HÔM NAY" (Card khoảng 80-120px khi thu gọn, có summary, click mở chi tiết) */}
      <div className="w-full rounded-[20px] border border-black/[0.05] bg-white/70 p-3.5 shadow-none backdrop-blur-sm transition-all duration-fast">
        {/* Accordion Header */}
        <div
          onClick={() => setTodayDetailsOpen(!todayDetailsOpen)}
          className="flex w-full cursor-pointer items-center justify-between text-left select-none"
        >
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-pink" />
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">
              Lịch quay hôm nay
            </h3>
            <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-secondary">
              {todayShoots.length} lịch
            </span>
          </div>
          <span className="grid size-5 place-items-center rounded-full text-secondary hover:text-ink transition-colors">
            {todayDetailsOpen ? <ArrowUp2 size={12} /> : <ArrowDown2 size={12} />}
          </span>
        </div>

        {/* Summary Content (~60-70px, bringing total collapsed height to ~90-110px) */}
        {displayShoot ? (
          <div className="mt-2.5 rounded-[12px] border border-black/[0.04] bg-white/80 p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <p className="font-display text-xs font-black uppercase tracking-tight text-ink line-clamp-1">
                {displayShoot.title}
              </p>
              <StatusChip
                tone={displayShoot.status === "confirmed" ? "success" : displayShoot.status === "cancelled" ? "error" : "warning"}
                className="text-[8px] min-h-4 px-1.5 font-black uppercase shrink-0"
              >
                {displayShoot.status === "confirmed" ? "Đã chốt" : displayShoot.status === "cancelled" ? "Đã hủy" : "Kế hoạch"}
              </StatusChip>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-secondary">
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-secondary/70 shrink-0" />
                <span>{formatDisplayTime(displayShoot.startsAt, timezone)} - {formatDisplayTime(displayShoot.endsAt, timezone)}</span>
              </span>
              <span className="truncate max-w-[130px] text-[10px] text-secondary/80">
                {displayShoot.projectName || "Studio"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center justify-between rounded-[12px] border border-dashed border-black/[0.08] px-3 py-2.5 text-[11px] text-secondary bg-black/[0.01]">
            <span>Hôm nay chưa có lịch quay</span>
            <Link
              href="/shoots"
              className="inline-flex items-center gap-0.5 text-[10px] font-black text-pink hover:underline"
            >
              <Add size={11} /> Tạo mới
            </Link>
          </div>
        )}

        {/* Detailed Expanded View (Click header to toggle) */}
        <AnimatePresence initial={false}>
          {todayDetailsOpen && displayShoot && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-black/[0.04] space-y-1.5 text-[11px] font-bold text-secondary">
                {displayShoot.locationName ? (
                  <div className="flex items-center gap-1.5 truncate">
                    <Location size={11} className="text-secondary/70 shrink-0" />
                    <span className="truncate">{displayShoot.locationName}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-secondary/70">
                    {displayShoot.crewCount ? `${displayShoot.crewCount} nhân sự tham gia` : "Chưa gắn ekip"}
                  </span>
                  <Link
                    href={`/shoots/${displayShoot.id}`}
                    className="text-[10px] font-black text-pink hover:underline"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. MODULE "CẦN CHÚ Ý" (Card khoảng 80-120px khi thu gọn, có summary, click mở chi tiết) */}
      <div className="w-full rounded-[20px] border border-black/[0.05] bg-white/70 p-3.5 shadow-none backdrop-blur-sm transition-all duration-fast">
        {/* Accordion Header */}
        <div
          onClick={() => setAttentionDetailsOpen(!attentionDetailsOpen)}
          className="flex w-full cursor-pointer items-center justify-between text-left select-none"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                attentionData.totalConflicts > 0
                  ? "bg-error animate-pulse"
                  : attentionData.pendingChecklistCount > 0
                  ? "bg-[#e59b00]"
                  : "bg-mint"
              )}
            />
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">
              Cần chú ý
            </h3>
            {attentionData.pendingChecklistCount + attentionData.totalConflicts > 0 ? (
              <span className="rounded-full bg-pink/15 px-1.5 py-0.5 text-[9px] font-black text-pink">
                {attentionData.pendingChecklistCount + attentionData.totalConflicts}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-[#1da875]">Tốt</span>
            )}
          </div>
          <span className="grid size-5 place-items-center rounded-full text-secondary hover:text-ink transition-colors">
            {attentionDetailsOpen ? <ArrowUp2 size={12} /> : <ArrowDown2 size={12} />}
          </span>
        </div>

        {/* Summary Content (~60-70px, bringing total collapsed height to ~95-110px) */}
        <div className="mt-2.5 space-y-1.5 text-[11px] font-bold">
          <div className="flex items-center justify-between rounded-[10px] bg-black/[0.02] px-2.5 py-1.5">
            <span className="text-secondary text-[11px]">Xung đột ekip & thiết bị</span>
            <span
              className={cn(
                "font-black text-[11px]",
                attentionData.totalConflicts > 0 ? "text-error" : "text-ink"
              )}
            >
              {attentionData.totalConflicts} xung đột
            </span>
          </div>
          <div className="flex items-center justify-between rounded-[10px] bg-black/[0.02] px-2.5 py-1.5">
            <span className="text-secondary text-[11px]">Checklist chưa xong</span>
            <span
              className={cn(
                "font-black text-[11px]",
                attentionData.pendingChecklistCount > 0 ? "text-[#b45309]" : "text-ink"
              )}
            >
              {attentionData.pendingChecklistCount} mục
            </span>
          </div>
        </div>

        {/* Detailed Expanded View (Click header to toggle) */}
        <AnimatePresence initial={false}>
          {attentionDetailsOpen && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 pt-2 border-t border-black/[0.04] space-y-2">
                {attentionData.conflictsList.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-error">Chi tiết xung đột:</p>
                    {attentionData.conflictsList.map((c, i) => (
                      <div key={i} className="rounded-[8px] bg-error/5 p-1.5 text-[10px] text-ink border border-error/15">
                        <strong className="block truncate">{c.shootTitle}</strong>
                        <span className="text-secondary">{c.note}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {attentionData.checklistItems.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-secondary">Mục checklist cần làm:</p>
                    {attentionData.checklistItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-[10px] text-ink">
                        <TickCircle size={11} className="text-secondary/50 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {attentionData.totalConflicts === 0 && attentionData.pendingChecklistCount === 0 ? (
                  <p className="text-center text-[10px] font-bold text-secondary py-0.5">
                    Mọi thứ đã sẵn sàng và an toàn! ✨
                  </p>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
