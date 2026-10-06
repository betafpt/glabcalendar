"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useTransition,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowLeft2,
  ArrowRight2,
  Clock,
  Location,
  Add,
} from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { useToast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { rescheduleShootAction } from "@/app/shoots/actions";
import { cn } from "@/lib/utils";

export const MIN_PIXELS_PER_HOUR = 32;
export const MAX_PIXELS_PER_HOUR = 96;
export const DEFAULT_PIXELS_PER_HOUR = 56;
export const TIME_SCALE_STORAGE_KEY = "glab_timeline_time_scale";

import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  TOTAL_MINUTES,
  hourSlots,
  getMinutesInDay,
  getDayBoundaries,
  computeDayShootPositions,
  getDefaultScrollMinute,
  getNowScrollMinute,
  type TimelineShootItem,
  type TimelineDayData,
  type PositionedShoot,
} from "@/lib/timeline-math";

export type { TimelineShootItem, TimelineDayData, PositionedShoot };
export {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  TOTAL_MINUTES,
  hourSlots,
  getMinutesInDay,
  getDayBoundaries,
  computeDayShootPositions,
  getDefaultScrollMinute,
  getNowScrollMinute,
};

type CalendarTimelineWeekProps = {
  days: TimelineDayData[];
  periodLabel: string;
  timezone: string;
  cleanParams: Record<string, string | undefined>;
  projectMap: Record<string, string>;
  onNavigatePrev: string;
  onNavigateNext: string;
  onNavigateToday: string;
  isViewingCurrentPeriod: boolean;
};

// Pastel color palette inspired by the reference design (lime, lilac, blush, mint)
const eventTones = [
  "bg-[#F0FDE4] text-[#1a3812] border border-[#DCFCE7] shadow-sm", // Soft Lime (signature reference color)
  "bg-[#F4EFFE] text-[#291754] border border-[#E9D8FD] shadow-sm", // Soft Lilac (signature reference color)
  "bg-[#FFF0F5] text-[#421028] border border-[#FFE4EF] shadow-sm", // Soft Blush Pink
  "bg-[#EAFBF3] text-[#0d3b2a] border border-[#D1F7E4] shadow-sm", // Soft Mint
  "bg-[#FFF9E6] text-[#3d2f0a] border border-[#FFE89A] shadow-sm", // Soft Lemon
];


function formatTimeSlot(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

type ActiveDragData = {
  shootId: string;
  shootTitle: string;
  startsAt: string;
  endsAt: string;
  tone: string;
  projectName?: string;
  crewNames?: string[];
  displayedSegmentStartMins?: number;
  dayKey?: string;
};

type ConflictDialogState = {
  shootId: string;
  shootTitle: string;
  newStartsAt: string;
  newEndsAt: string;
  targetDateFormatted: string;
  conflicts: Array<{ type: "crew" | "equipment"; name: string; shootTitle: string }>;
} | null;

export function CalendarTimelineWeek({
  days,
  periodLabel,
  timezone,
  cleanParams,
  projectMap,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  isViewingCurrentPeriod,
}: CalendarTimelineWeekProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const [columnsData, setColumnsData] = useState<TimelineDayData[]>(days);
  const [activeShoot, setActiveShoot] = useState<ActiveDragData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictDialogState>(null);

  const [pixelsPerHour, setPixelsPerHour] = useState(DEFAULT_PIXELS_PER_HOUR);
  const [isResizingTimeScale, setIsResizingTimeScale] = useState(false);
  const resizeStateRef = useRef<{
    pointerId: number;
    startY: number;
    startScale: number;
    currentScale: number;
    anchorY: number;
    anchorMinute: number;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TIME_SCALE_STORAGE_KEY));
      if (Number.isFinite(saved)) {
        setPixelsPerHour(Math.max(MIN_PIXELS_PER_HOUR, Math.min(MAX_PIXELS_PER_HOUR, saved)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const hourHeight = pixelsPerHour;

  // Timeline Scroll Ref & Auto-scroll logic
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: true });

  const updateScrollEdges = useCallback(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    setScrollEdges({
      top: el.scrollTop > 2,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2,
    });
  }, []);

  const scrollToMinute = useCallback((minuteOfDay: number, smooth = true) => {
    if (!timelineScrollRef.current) return;
    const clampedMinute = Math.max(0, Math.min(TOTAL_MINUTES, minuteOfDay));
    const targetScrollTop = clampedMinute * (hourHeight / 60);
    timelineScrollRef.current.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? "smooth" : "auto",
    });
    requestAnimationFrame(updateScrollEdges);
  }, [hourHeight, updateScrollEdges]);

  useEffect(() => {
    setColumnsData(days);
  }, [days]);

  // Current time position calculation (e.g. 10:30 AM)
  const now = new Date();
  const currentMinutes = getMinutesInDay(now.toISOString(), timezone);
  const currentMinute = currentMinutes % 60;

  // Auto-scroll when viewing current period or another week
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasUserScrolledRef.current) return;

      let targetMinute: number;
      let shouldScrollNow = false;
      try {
        if (sessionStorage.getItem("glab_scroll_now") === "1") {
          shouldScrollNow = true;
          sessionStorage.removeItem("glab_scroll_now");
        }
      } catch {
        // Ignore
      }

      if (shouldScrollNow) {
        targetMinute = getNowScrollMinute(currentMinutes);
      } else {
        targetMinute = getDefaultScrollMinute(columnsData, timezone);
      }
      scrollToMinute(targetMinute, false);
    }, 60);

    return () => clearTimeout(timer);
  }, [columnsData, timezone, currentMinutes, scrollToMinute]);

  const handleScroll = () => {
    hasUserScrolledRef.current = true;
    updateScrollEdges();
  };

  const handleTimeScalePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = scrollEl.getBoundingClientRect();
    const anchorY = Math.max(0, Math.min(scrollEl.clientHeight, event.clientY - rect.top));
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScale: pixelsPerHour,
      currentScale: pixelsPerHour,
      anchorY,
      anchorMinute: (scrollEl.scrollTop + anchorY) / (pixelsPerHour / 60),
    };
    hasUserScrolledRef.current = true;
    setIsResizingTimeScale(true);
  };

  const handleTimeScalePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = resizeStateRef.current;
    const scrollEl = timelineScrollRef.current;
    if (!state || !scrollEl || state.pointerId !== event.pointerId) return;

    const nextScale = Math.round(
      Math.max(
        MIN_PIXELS_PER_HOUR,
        Math.min(MAX_PIXELS_PER_HOUR, state.startScale + (event.clientY - state.startY) * 0.5)
      )
    );
    if (nextScale === pixelsPerHour) return;

    state.currentScale = nextScale;
    setPixelsPerHour(nextScale);
    requestAnimationFrame(() => {
      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      scrollEl.scrollTop = Math.max(
        0,
        Math.min(maxScrollTop, state.anchorMinute * (nextScale / 60) - state.anchorY)
      );
      updateScrollEdges();
    });
  };

  const finishTimeScaleResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = resizeStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    resizeStateRef.current = null;
    setIsResizingTimeScale(false);
    try {
      localStorage.setItem(TIME_SCALE_STORAGE_KEY, String(state.currentScale));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as ActiveDragData | undefined;
    if (data) setActiveShoot(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShoot(null);

    if (!over) return;

    const targetDateKey = String(over.data.current?.dateKey ?? "");
    const shootId = String(active.data.current?.shootId ?? "");
    const currentStartsAt = String(active.data.current?.startsAt ?? "");
    const currentEndsAt = String(active.data.current?.endsAt ?? "");

    if (!targetDateKey || !shootId || !currentStartsAt) return;

    const oldStart = new Date(currentStartsAt);
    const oldEnd = new Date(currentEndsAt);
    const durationMs = Math.max(1800_000, oldEnd.getTime() - oldStart.getTime());

    const renderedDayKey = String(
      active.data.current?.dayKey ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(oldStart)
    );

    const displayedSegmentStartMins =
      typeof active.data.current?.displayedSegmentStartMins === "number"
        ? active.data.current.displayedSegmentStartMins
        : getMinutesInDay(currentStartsAt, timezone);

    const pixelsPerMinute = hourHeight / 60;
    const draggedMinutes = event.delta.y / pixelsPerMinute;
    const snappedDeltaMinutes = Math.round(draggedMinutes / 15) * 15;
    const targetSegmentStartMins = Math.max(
      0,
      Math.min(TOTAL_MINUTES - 15, displayedSegmentStartMins + snappedDeltaMinutes)
    );

    if (renderedDayKey === targetDateKey && targetSegmentStartMins === displayedSegmentStartMins) {
      return;
    }

    const { dayStartMs: sourceDayStartMs } = getDayBoundaries(renderedDayKey, timezone);
    const origSegmentMs = sourceDayStartMs + displayedSegmentStartMins * 60_000;

    const { dayStartMs: targetDayStartMs } = getDayBoundaries(targetDateKey, timezone);
    const targetSegmentMs = targetDayStartMs + targetSegmentStartMins * 60_000;

    const shiftMs = targetSegmentMs - origSegmentMs;
    const newStart = new Date(oldStart.getTime() + shiftMs);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newStartIso = newStart.toISOString();
    const newEndIso = newEnd.toISOString();

    const previousColumns = columnsData;

    // Optimistic update
    let movedShoot: TimelineShootItem | null = null;
    for (const col of previousColumns) {
      const match = col.shoots.find((s) => s.id === shootId);
      if (match) {
        movedShoot = { ...match, startsAt: newStartIso, endsAt: newEndIso };
        break;
      }
    }

    if (!movedShoot) {
      movedShoot = {
        id: shootId,
        title: active.data.current?.shootTitle || "Buổi quay",
        startsAt: newStartIso,
        endsAt: newEndIso,
        status: "confirmed",
        isPastOrCompleted: false,
        crewNames: active.data.current?.crewNames,
      };
    }

    const newStartMs = newStart.getTime();
    const newEndMs = newEnd.getTime();

    setColumnsData((current) =>
      current.map((col) => {
        const { dayStartMs, dayEndMs } = getDayBoundaries(col.dateKey, timezone);
        const shootsWithoutCurrent = col.shoots.filter((s) => s.id !== shootId);
        const overlaps = newStartMs < dayEndMs && newEndMs > dayStartMs;

        return {
          ...col,
          shoots: overlaps ? [...shootsWithoutCurrent, movedShoot!] : shootsWithoutCurrent,
        };
      })
    );

    try {
      const res = await rescheduleShootAction({
        shootId,
        startsAt: newStartIso,
        endsAt: newEndIso,
      });

      if (!res.ok) {
        setColumnsData(previousColumns);
        if (res.conflict) {
          setConflictData({
            shootId,
            shootTitle: active.data.current?.shootTitle || "Buổi quay",
            newStartsAt: newStartIso,
            newEndsAt: newEndIso,
            targetDateFormatted: targetDateKey,
            conflicts: res.conflicts,
          });
          return;
        }
        showToast({ message: res.messageVi || "Không thể dời lịch quay." });
        return;
      }

      showToast({ message: "Đã dời lịch quay thành công!" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setColumnsData(previousColumns);
      showToast({ message: "Lỗi kết nối khi dời lịch." });
    }
  };

  const handleForceReschedule = async () => {
    if (!conflictData) return;
    const { shootId, newStartsAt, newEndsAt } = conflictData;
    setConflictData(null);

    try {
      const res = await rescheduleShootAction({
        shootId,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        force: true,
      });
      if (res.ok) {
        showToast({ message: "Đã xác nhận dời lịch quay." });
        router.refresh();
      } else {
        showToast({ message: res.messageVi || "Không thể dời lịch." });
      }
    } catch {
      showToast({ message: "Lỗi kết nối." });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-3 sm:p-4 2xl:p-5 shadow-sm flex flex-col h-full min-h-0">
        {/* TIMELINE TOP TOOLBAR: PERIOD TITLE, PREV/NEXT, TODAY/HIỆN TẠI, DENSITY & + TẠO LỊCH QUAY */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-black/[0.05] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h3 className="font-display text-base sm:text-lg font-black tracking-tight text-ink">
              {periodLabel}
            </h3>

            <div className="flex items-center gap-1">
              <Link
                href={onNavigatePrev}
                title="Tuần trước"
                className="grid size-8 place-items-center rounded-full border border-black/[0.06] bg-surface text-ink shadow-xs hover:bg-white active:scale-press transition-all"
              >
                <ArrowLeft2 size={13} variant="Linear" />
              </Link>

              <Link
                href={onNavigateNext}
                title="Tuần sau"
                className="grid size-8 place-items-center rounded-full border border-black/[0.06] bg-surface text-ink shadow-xs hover:bg-white active:scale-press transition-all"
              >
                <ArrowRight2 size={13} variant="Linear" />
              </Link>
            </div>

            <Link
              href={onNavigateToday}
              onClick={(e) => {
                if (isViewingCurrentPeriod) {
                  e.preventDefault();
                  hasUserScrolledRef.current = false;
                  scrollToMinute(getNowScrollMinute(currentMinutes), true);
                } else {
                  try {
                    sessionStorage.setItem("glab_scroll_now", "1");
                  } catch {
                    // Ignore
                  }
                }
              }}
              title="Về ngày và giờ hiện tại"
              className={cn(
                "inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-black transition-all duration-fast active:scale-press",
                isViewingCurrentPeriod
                  ? "bg-pink text-white shadow-soft"
                  : "bg-surface border border-black/[0.06] text-ink hover:bg-white"
              )}
            >
              <LocalizedText vi="Hiện tại" en="Today" />
            </Link>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
            {/* Primary Action Button "+ Tạo lịch quay" */}
            <Link
              href="/shoots"
              className="inline-flex min-h-8 sm:min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 sm:px-4 text-[11px] sm:text-xs font-black text-white shadow-soft transition-all duration-fast hover:bg-pink active:scale-press shrink-0"
            >
              <Add size={14} variant="Linear" />
              <span className="hidden sm:inline">Tạo lịch quay</span>
              <span className="sm:hidden">Tạo</span>
            </Link>
          </div>
        </div>

        {/* TIMELINE SCROLL AREA (CHỈ VÙNG NÀY ĐƯỢC overflow-y: auto) */}
        <div className="relative mt-3 flex-1 min-h-0 w-full min-w-0 max-w-full overflow-hidden">
          <div
            ref={timelineScrollRef}
            onScroll={handleScroll}
            className="timeline-scroll-area h-full w-full min-w-0 max-w-full overflow-y-auto overflow-x-auto select-none overscroll-contain relative"
          >
            <div
              className="min-w-[720px] flex flex-col relative"
              style={{ minHeight: `${TOTAL_HOURS * hourHeight + 52}px` }}
            >
            {/* 2.1 STICKY DAY HEADERS ROW */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-black/[0.05] pb-2 pt-1.5">
              {/* Top-left corner: GMT+7 (sticky both top and left) */}
              <div className="sticky left-0 z-40 bg-white/95 backdrop-blur-md text-[10px] font-black uppercase text-secondary/70 flex items-center justify-between pl-1.5">
                <span>GMT+7</span>
                <div className="relative">
                  <motion.button
                    type="button"
                    aria-label="Kéo để co giãn thời gian"
                    title="Kéo để co giãn thời gian"
                    onPointerDown={handleTimeScalePointerDown}
                    onPointerMove={handleTimeScalePointerMove}
                    onPointerUp={finishTimeScaleResize}
                    onPointerCancel={finishTimeScaleResize}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                    className="group grid size-11 touch-none place-items-center rounded-full cursor-ns-resize text-secondary/60 hover:bg-pink/10 hover:text-pink"
                  >
                    <span className="text-[18px] font-black leading-none" aria-hidden="true">↕</span>
                  </motion.button>
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isResizingTimeScale ? 1 : 0,
                      y: isResizingTimeScale ? 0 : -3,
                    }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                    className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-1 text-[10px] font-black normal-case text-white shadow-soft"
                  >
                    {pixelsPerHour}px / giờ
                  </motion.div>
                </div>
              </div>

              {/* 7 Days Header */}
              {columnsData.map((day) => (
                <div key={day.dateKey} className="text-center px-1">
                  <div
                    className={cn(
                      "font-display text-lg sm:text-xl font-black leading-none",
                      day.isToday ? "text-pink" : "text-ink"
                    )}
                  >
                    {String(day.dayNumber).padStart(2, "0")}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-[10px] font-bold uppercase tracking-wider",
                      day.isToday ? "text-pink font-black" : "text-secondary"
                    )}
                  >
                    {day.dayName}
                  </div>
                </div>
              ))}
            </div>

            {/* 2.2 TIMELINE BODY GRID: STICKY TIME COLUMN + 7 DAY COLUMNS */}
            <div
              className="relative flex-1 grid grid-cols-[60px_repeat(7,minmax(0,1fr))]"
              style={{ height: `${TOTAL_HOURS * hourHeight}px` }}
            >
              {/* STICKY TIME MARKERS COLUMN (sticky left-0) */}
              <div className="sticky left-0 z-20 bg-white/95 backdrop-blur-md relative h-full select-none">
                {hourSlots.map((slot, idx) => (
                  <div
                    key={slot.hour}
                    className="absolute left-0 right-0 -translate-y-1/2 pl-1.5 text-[11px] font-extrabold text-secondary/60 leading-none flex items-center"
                    style={{ top: `${idx * hourHeight}px` }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* 7 COLUMNS DROP ZONES */}
              {columnsData.map((col, colIdx) => (
                <DroppableTimelineColumn
                  key={col.dateKey}
                  day={col}
                  colIdx={colIdx}
                  timezone={timezone}
                  projectMap={projectMap}
                  hourHeight={hourHeight}
                />
              ))}

              {/* CURRENT TIME HORIZONTAL INDICATOR LINE */}
              {currentMinutes >= 0 && currentMinutes <= TOTAL_MINUTES && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-25 flex items-center"
                  style={{
                    top: `${(currentMinutes / 60) * hourHeight}px`,
                  }}
                >
                  <span className="size-2 rounded-full bg-pink shadow-[0_0_8px_rgba(255,79,154,0.8)] -ml-1" />
                  <div className="h-[1.5px] w-full bg-pink/60 shadow-sm" />
                </div>
              )}
            </div>
            </div>
          </div>
          {scrollEdges.top ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-3 shadow-[inset_0_8px_10px_-12px_rgba(9,9,9,0.35)]" />
          ) : null}
          {scrollEdges.bottom ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-3 shadow-[inset_0_-8px_10px_-12px_rgba(9,9,9,0.35)]" />
          ) : null}
        </div>
      </section>

      {/* Drag Overlay: Floating drag thumbnail */}
      <DragOverlay dropAnimation={null}>
        {activeShoot ? (
          <div
            className={cn(
              "pointer-events-none rounded-[18px] p-3 shadow-nav border border-stroke/80 rotate-2 scale-105 bg-white/95 backdrop-blur-md max-w-[190px]",
              activeShoot.tone
            )}
          >
            <p className="truncate text-[9px] font-black uppercase tracking-wider text-ink/70">
              {activeShoot.projectName || "G.Lab Shoot"}
            </p>
            <h4 className="mt-0.5 font-display text-xs font-black uppercase leading-tight text-ink line-clamp-1">
              {activeShoot.shootTitle}
            </h4>
            <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-ink/75">
              <span>{formatTimeSlot(activeShoot.startsAt, timezone)}</span>
              {activeShoot.crewNames && activeShoot.crewNames.length > 0 ? (
                <div className="flex -space-x-1.5">
                  {activeShoot.crewNames.slice(0, 3).map((name, i) => (
                    <div
                      key={i}
                      title={name}
                      className="grid size-4 place-items-center rounded-full bg-ink text-[7px] font-black text-white ring-1 ring-white"
                    >
                      {name.charAt(0)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Dialog Cảnh báo Xung đột khi dời lịch */}
      <AlertDialog
        open={Boolean(conflictData)}
        onOpenChange={(open) => {
          if (!open) setConflictData(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-ink">
              <span className="size-2 rounded-full bg-pink animate-pulse" />
              <span>Phát hiện xung đột lịch quay</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-secondary text-xs sm:text-sm">
              Buổi quay <strong className="text-ink">&quot;{conflictData?.shootTitle}&quot;</strong> khi dời sang ngày <strong className="text-ink">{conflictData?.targetDateFormatted}</strong> sẽ gây trùng lịch với các phân bổ sau:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2 max-h-48 overflow-y-auto space-y-2 rounded-r16 bg-surface/70 p-3 border border-stroke/70">
            {conflictData?.conflicts.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs rounded-r10 bg-white p-2.5 border border-stroke/50 shadow-soft"
              >
                <span
                  className={cn(
                    "mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0",
                    c.type === "crew"
                      ? "bg-accent-lilac/30 text-[#6442d8]"
                      : "bg-accent-mint/30 text-[#147a54]"
                  )}
                >
                  {c.type === "crew" ? "Nhân sự" : "Thiết bị"}
                </span>
                <div className="min-w-0">
                  <p className="font-black text-ink">{c.name}</p>
                  <p className="text-[11px] text-secondary">
                    Đã có lịch tại: <span className="font-bold text-ink/80">&quot;{c.shootTitle}&quot;</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConflictData(null)}>
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceReschedule}
              className="bg-pink text-white hover:bg-pink/90 font-black"
            >
              Vẫn dời lịch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}

function DroppableTimelineColumn({
  day,
  colIdx,
  timezone,
  projectMap,
  hourHeight,
}: {
  day: TimelineDayData;
  colIdx: number;
  timezone: string;
  projectMap: Record<string, string>;
  hourHeight: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-col-${day.dateKey}`,
    data: { dateKey: day.dateKey, dayIso: day.dayIso },
  });

  const positionedShoots = useMemo(
    () => computeDayShootPositions(day.shoots, day.dateKey, timezone, hourHeight),
    [day.shoots, day.dateKey, timezone, hourHeight]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative h-full border-l border-stroke/50 transition-colors",
        day.isToday && "bg-pink/[0.02]",
        isOver && "bg-pink/[0.08] ring-2 ring-pink ring-inset z-10"
      )}
    >
      {/* Background hour divider lines */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: TOTAL_HOURS + 1 }).map((_, idx) => (
          <div
            key={idx}
            className="absolute left-0 right-0 h-px bg-stroke/30"
            style={{ top: `${idx * hourHeight}px` }}
          />
        ))}
      </div>

      {/* Events inside this day column positioned precisely on the timeline */}
      <div className="pointer-events-none absolute inset-0">
        {positionedShoots.map(({ shoot, top, height, left, width, zIndex, startMins }, shootIdx) => {
          const tone = eventTones[(colIdx + shootIdx) % eventTones.length];
          const projectName = shoot.projectId ? projectMap[shoot.projectId] : undefined;
          const heightPx = parseInt(height, 10) || hourHeight;

          return (
            <div
              key={`${shoot.id}-${day.dateKey}`}
              className="pointer-events-auto"
              style={{
                position: "absolute",
                top,
                height,
                left,
                width,
                zIndex,
              }}
            >
              <DraggableTimelineShootCard
                shoot={shoot}
                dayKey={day.dateKey}
                displayedSegmentStartMins={startMins}
                tone={tone}
                timezone={timezone}
                projectName={projectName}
                heightPx={heightPx}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraggableTimelineShootCard({
  shoot,
  dayKey,
  displayedSegmentStartMins,
  tone,
  timezone,
  projectName,
  heightPx,
}: {
  shoot: TimelineShootItem;
  dayKey: string;
  displayedSegmentStartMins: number;
  tone: string;
  timezone: string;
  projectName?: string;
  heightPx: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shoot-${shoot.id}-${dayKey}`,
    data: {
      shootId: shoot.id,
      shootTitle: shoot.title,
      startsAt: shoot.startsAt,
      endsAt: shoot.endsAt,
      tone,
      projectName,
      crewNames: shoot.crewNames,
      displayedSegmentStartMins,
      dayKey,
    },
  });

  const timeLabel = `${formatTimeSlot(shoot.startsAt, timezone)} - ${formatTimeSlot(shoot.endsAt, timezone)}`;
  const isCompact = heightPx < 50;
  const isStandard = heightPx >= 50 && heightPx < 76;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "h-full w-full cursor-grab active:cursor-grabbing select-none transition-all duration-fast",
        isDragging && "opacity-25 scale-95"
      )}
    >
      <Link
        href={`/shoots/${shoot.id}`}
        className={cn(
          "group flex flex-col justify-between h-full rounded-[12px] sm:rounded-[14px] transition-all duration-fast hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98] overflow-hidden",
          isCompact ? "p-1.5" : "p-2 sm:px-2.5 sm:py-2",
          tone,
          shoot.isPastOrCompleted && "opacity-60 grayscale-[25%]"
        )}
      >
        {isCompact ? (
          /* Ultra Compact View (<50px): single row, title + time + status dot */
          <div className="flex items-center justify-between gap-1 w-full min-w-0 h-full">
            <div className="min-w-0 flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  shoot.status === "confirmed"
                    ? "bg-[#1da875]"
                    : shoot.status === "cancelled"
                    ? "bg-error"
                    : "bg-[#e59b00]"
                )}
                title={shoot.status}
              />
              <h4 className="font-display text-[10px] font-black uppercase tracking-tight truncate leading-tight">
                {shoot.title}
              </h4>
            </div>
            <span className="text-[9px] font-extrabold opacity-75 shrink-0 tabular-nums leading-none">
              {formatTimeSlot(shoot.startsAt, timezone)}
            </span>
          </div>
        ) : isStandard ? (
          /* Standard View (50px - 75px): Project Tag + Title + Time & Status */
          <div className="min-w-0 flex flex-col justify-between h-full">
            <div className="min-w-0">
              <p className="truncate text-[8px] font-black uppercase tracking-wider opacity-70 leading-none mb-0.5">
                {projectName || "G.Lab Shoot"}
              </p>
              <h4 className="font-display text-[11px] font-black uppercase leading-tight tracking-tight truncate">
                {shoot.title}
              </h4>
            </div>
            <div className="flex items-center justify-between text-[9px] font-extrabold opacity-75 pt-1 border-t border-black/5 leading-none">
              <span>{timeLabel}</span>
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  shoot.status === "confirmed"
                    ? "bg-[#1da875]"
                    : shoot.status === "cancelled"
                    ? "bg-error"
                    : "bg-[#e59b00]"
                )}
                title={shoot.status}
              />
            </div>
          </div>
        ) : (
          /* Spacious View (>=76px): Full rich G.Lab card with crew avatars */
          <>
            <div className="min-w-0 flex flex-col justify-start">
              <p className="truncate text-[9px] font-black uppercase tracking-wider opacity-75 leading-none mb-1">
                {projectName || "G.Lab Shoot"}
              </p>

              <h4 className="font-display text-[11px] sm:text-[12px] font-black uppercase leading-[1.25] tracking-tight line-clamp-2">
                {shoot.title}
              </h4>

              <p className="mt-1 text-[10px] font-extrabold opacity-75 tabular-nums leading-none">
                {timeLabel}
              </p>
            </div>

            <div className="shrink-0 mt-1 flex items-center justify-between gap-1 pt-1 border-t border-black/5">
              <div className="flex -space-x-1.5 items-center">
                {shoot.crewNames && shoot.crewNames.length > 0 ? (
                  <>
                    {shoot.crewNames.slice(0, 3).map((name, i) => (
                      <div
                        key={i}
                        title={name}
                        className="grid size-5 place-items-center rounded-full bg-ink text-[8px] font-black text-white ring-1 ring-white/80 shrink-0"
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {shoot.crewNames.length > 3 ? (
                      <span className="grid size-5 place-items-center rounded-full bg-surface text-[8px] font-black text-ink ring-1 ring-stroke shrink-0">
                        +{shoot.crewNames.length - 3}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[9px] font-bold opacity-60 leading-none">Chưa xếp ekip</span>
                )}
              </div>

              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  shoot.status === "confirmed"
                    ? "bg-[#1da875]"
                    : shoot.status === "cancelled"
                    ? "bg-error"
                    : "bg-[#e59b00]"
                )}
                title={shoot.status}
              />
            </div>
          </>
        )}
      </Link>
    </div>
  );
}
