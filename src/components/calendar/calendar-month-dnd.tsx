"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export type MonthShootItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isPastOrCompleted: boolean;
  projectId?: string | null;
  locationName?: string | null;
};

export type MonthDayData = {
  dateKey: string;
  dayNumber: number;
  isToday: boolean;
  outsideMonth: boolean;
  dayIso: string;
  shoots: MonthShootItem[];
};

type CalendarMonthDndProps = {
  days: MonthDayData[];
  timezone: string;
  todayKey: string;
  weekHeaders: Array<{ vi: string; en: string; isWeekend: boolean }>;
  cleanParams: Record<string, string | undefined>;
  periodLabel?: string;
  onNavigatePrev?: string;
  onNavigateNext?: string;
  onNavigateToday?: string;
  isViewingCurrentPeriod?: boolean;
};

const eventTones = [
  "bg-[#f3efff] text-ink border border-[#dcd5ff]/80", // Lilac
  "bg-[#eafaf3] text-ink border border-[#cff7e7]/80", // Mint
  "bg-[#fff9e6] text-ink border border-[#ffe89a]/80", // Yellow
  "bg-[#edf5ff] text-ink border border-[#cde7ff]/80", // Sky
  "bg-[#fff0f4] text-ink border border-[#ffc3d2]/80", // Coral
];

const toneAccentDots = [
  "bg-[#7a58ec]",
  "bg-[#1da875]",
  "bg-[#e59b00]",
  "bg-[#2d7bf4]",
  "bg-[#ff4f9a]",
];

const statusAccent: Record<string, string> = {
  planned: "bg-[#7a58ec]",
  confirmed: "bg-[#1da875]",
  ready: "bg-[#1da875]",
  in_progress: "bg-[#ff4f9a] animate-pulse",
  completed: "bg-[#64748b]",
  cancelled: "bg-[#dc4c64]",
};

function formatTime(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function queryHref(
  view: string,
  dateStr: string,
  params: Record<string, string | undefined>
) {
  const query = new URLSearchParams();
  query.set("view", view);
  query.set("date", dateStr);
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "view" && key !== "date") {
      query.set(key, value);
    }
  }
  return `/calendar?${query.toString()}`;
}

type ActiveDragData = {
  shootId: string;
  shootTitle: string;
  startsAt: string;
  endsAt: string;
  tone: string;
  dotTone: string;
};

type ConflictDialogState = {
  shootId: string;
  shootTitle: string;
  newStartsAt: string;
  newEndsAt: string;
  targetDateFormatted: string;
  conflicts: Array<{ type: "crew" | "equipment"; name: string; shootTitle: string }>;
} | null;

export function CalendarMonthDnd({
  days,
  timezone,
  todayKey,
  weekHeaders,
  cleanParams,
  periodLabel,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  isViewingCurrentPeriod,
}: CalendarMonthDndProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [monthDays, setMonthDays] = useState<MonthDayData[]>(days);
  const [activeShoot, setActiveShoot] = useState<ActiveDragData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictDialogState>(null);

  useEffect(() => {
    setMonthDays(days);
  }, [days]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as ActiveDragData | undefined;
    if (data) {
      setActiveShoot(data);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShoot(null);

    if (!over) return;

    const targetDateKey = String(over.data.current?.dateKey ?? "");
    const shootId = String(active.data.current?.shootId ?? "");
    const shootTitle = String(active.data.current?.shootTitle ?? "");
    const currentStartsAt = String(active.data.current?.startsAt ?? "");
    const currentEndsAt = String(active.data.current?.endsAt ?? "");

    if (!targetDateKey || !shootId || !currentStartsAt) return;

    // Phân tách ngày đích
    const [targetYear, targetMonth, targetDay] = targetDateKey.split("-").map(Number);
    if (!targetYear || !targetMonth || !targetDay) return;

    const oldStart = new Date(currentStartsAt);
    const oldEnd = new Date(currentEndsAt);

    // Tính dateKey cũ theo múi giờ
    const oldDateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(oldStart);

    // Nếu thả vào cùng một ngày, không làm gì
    if (oldDateKey === targetDateKey) return;

    const durationMs = Math.max(1800_000, oldEnd.getTime() - oldStart.getTime());

    // Tạo thời gian bắt đầu mới giữ nguyên giờ:phút
    const newStart = new Date(oldStart);
    newStart.setFullYear(targetYear, targetMonth - 1, targetDay);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newStartIso = newStart.toISOString();
    const newEndIso = newEnd.toISOString();

    const previousDays = monthDays;

    // Optimistic update ngay lập tức (0ms UX)
    let movedShoot: MonthShootItem | null = null;
    for (const d of previousDays) {
      const match = d.shoots.find((s) => s.id === shootId);
      if (match) {
        movedShoot = { ...match, startsAt: newStartIso, endsAt: newEndIso };
        break;
      }
    }

    if (movedShoot) {
      setMonthDays((current) =>
        current.map((d) => {
          if (d.dateKey === oldDateKey) {
            return { ...d, shoots: d.shoots.filter((s) => s.id !== shootId) };
          }
          if (d.dateKey === targetDateKey) {
            return { ...d, shoots: [...d.shoots, movedShoot!] };
          }
          return d;
        })
      );
    }

    try {
      const res = await rescheduleShootAction({
        shootId,
        startsAt: newStartIso,
        endsAt: newEndIso,
      });

      if (!res.ok) {
        // Rollback ngay lập tức
        setMonthDays(previousDays);

        if (res.conflict) {
          setConflictData({
            shootId,
            shootTitle,
            newStartsAt: newStartIso,
            newEndsAt: newEndIso,
            targetDateFormatted: `${String(targetDay).padStart(2, "0")}/${String(targetMonth).padStart(2, "0")}/${targetYear}`,
            conflicts: res.conflicts,
          });
        } else {
          showToast({
            message: res.messageVi ?? "Không thể dời lịch quay.",
            undoLabel: "Thử lại",
            onUndo: () => handleDragEnd(event),
          });
        }
      } else {
        showToast({
          message: `Đã dời "${shootTitle}" sang ngày ${String(targetDay).padStart(2, "0")}/${String(targetMonth).padStart(2, "0")}`,
          undoLabel: "Hoàn tác",
          onUndo: async () => {
            // Optimistic revert
            setMonthDays(previousDays);
            const undoRes = await rescheduleShootAction({
              shootId,
              startsAt: res.previousStartsAt,
              endsAt: res.previousEndsAt,
              force: true,
            });
            if (undoRes.ok) {
              showToast({ message: "Đã hoàn tác lịch quay về ngày ban đầu." });
              startTransition(() => router.refresh());
            } else {
              showToast({ message: "Không thể hoàn tác lịch quay." });
              startTransition(() => router.refresh());
            }
          },
        });
        startTransition(() => router.refresh());
      }
    } catch {
      setMonthDays(previousDays);
      showToast({
        message: "Đã xảy ra lỗi khi dời lịch quay.",
        undoLabel: "Thử lại",
        onUndo: () => handleDragEnd(event),
      });
    }
  };

  const handleForceReschedule = async () => {
    if (!conflictData) return;
    const { shootId, shootTitle, newStartsAt, newEndsAt, targetDateFormatted } = conflictData;
    setConflictData(null);

    try {
      const res = await rescheduleShootAction({
        shootId,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        force: true,
      });

      if (res.ok) {
        showToast({
          message: `Đã dời "${shootTitle}" sang ngày ${targetDateFormatted}`,
          undoLabel: "Hoàn tác",
          onUndo: async () => {
            await rescheduleShootAction({
              shootId,
              startsAt: res.previousStartsAt,
              endsAt: res.previousEndsAt,
              force: true,
            });
            showToast({ message: "Đã hoàn tác lịch quay." });
            startTransition(() => router.refresh());
          },
        });
        startTransition(() => router.refresh());
      } else {
        showToast({ message: res.messageVi ?? "Không thể dời lịch." });
      }
    } catch {
      showToast({ message: "Lỗi kết nối khi dời lịch." });
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <section className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-4 sm:p-5 2xl:p-6 shadow-sm calendar-min-h flex flex-col">
          {/* MONTH TOP TOOLBAR (Directly above grid) */}
          {periodLabel ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-black/[0.05] mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-base sm:text-lg font-black tracking-tight text-ink">
                  {periodLabel}
                </h3>

                {onNavigatePrev && onNavigateNext ? (
                  <div className="flex items-center gap-1">
                    <Link
                      href={onNavigatePrev}
                      title="Tháng trước"
                      className="grid size-8 place-items-center rounded-full border border-black/[0.06] bg-surface text-ink shadow-xs hover:bg-white active:scale-press transition-all"
                    >
                      <ArrowLeft2 size={13} variant="Linear" />
                    </Link>

                    <Link
                      href={onNavigateNext}
                      title="Tháng sau"
                      className="grid size-8 place-items-center rounded-full border border-black/[0.06] bg-surface text-ink shadow-xs hover:bg-white active:scale-press transition-all"
                    >
                      <ArrowRight2 size={13} variant="Linear" />
                    </Link>
                  </div>
                ) : null}

                {onNavigateToday ? (
                  <Link
                    href={onNavigateToday}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-black transition-all duration-fast active:scale-press",
                      isViewingCurrentPeriod
                        ? "bg-pink text-white shadow-soft"
                        : "bg-surface border border-black/[0.06] text-ink hover:bg-white"
                    )}
                  >
                    <LocalizedText vi="Hôm nay" en="Today" />
                  </Link>
                ) : null}
              </div>

              {/* Primary Action Button "+ Tạo lịch quay" */}
              <div className="flex items-center justify-end">
                <Link
                  href="/shoots"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-black text-white shadow-soft transition-all duration-fast hover:bg-pink active:scale-press"
                >
                  <Add size={14} variant="Linear" />
                  <span>Tạo lịch quay</span>
                </Link>
              </div>
            </div>
          ) : null}

          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-black/[0.05] bg-transparent pb-2.5 text-center">
            {weekHeaders.map((day) => (
              <div
                key={day.en}
                className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.08em]"
              >
                <span className={day.isWeekend ? "text-pink" : "text-secondary"}>
                  <LocalizedText vi={day.vi} en={day.en} />
                </span>
              </div>
            ))}
          </div>

          {/* 7-Column Month Days Grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, dayIndex) => (
              <DroppableDayCell
                key={day.dateKey}
                day={day}
                dayIndex={dayIndex}
                cleanParams={cleanParams}
                timezone={timezone}
                todayKey={todayKey}
              />
            ))}
          </div>
        </section>

        {/* Drag Overlay: Preview thẻ nổi lơ lửng khi kéo */}
        <DragOverlay dropAnimation={null}>
          {activeShoot ? (
            <div
              className={cn(
                "pointer-events-none rounded-r10 px-2 sm:px-2.5 py-1 text-left shadow-nav border border-stroke/80 rotate-2 scale-105 bg-white/95 backdrop-blur-md",
                activeShoot.tone
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn("size-2 shrink-0 rounded-full", activeShoot.dotTone)} />
                <span className="text-[10px] font-black text-ink/75 tabular-nums">
                  {formatTime(activeShoot.startsAt, timezone)}
                </span>
                <span className="truncate text-[10px] font-black leading-tight text-ink">
                  {activeShoot.shootTitle}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog cảnh báo xung đột lịch */}
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

          {/* Danh sách các xung đột */}
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
    </>
  );
}

function DroppableDayCell({
  day,
  dayIndex,
  cleanParams,
  timezone,
  todayKey,
}: {
  day: MonthDayData;
  dayIndex: number;
  cleanParams: Record<string, string | undefined>;
  timezone: string;
  todayKey: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.dateKey}`,
    data: { dateKey: day.dateKey, dayIso: day.dayIso },
  });

  const isToday = day.dateKey === todayKey;

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "group relative flex flex-col justify-between border-b border-r border-black/[0.05] transition-colors duration-fast min-h-[70px] p-1 sm:min-h-[96px] sm:p-1.5 lg:min-h-[120px] lg:p-2",
        day.outsideMonth
          ? "bg-[#faf5f8]/30 hover:bg-white/60 text-secondary/40"
          : isToday
          ? "bg-pink/[0.04] hover:bg-white/90"
          : "bg-transparent hover:bg-white",
        isOver && "ring-2 ring-pink ring-inset bg-pink/[0.12] scale-[1.01] z-10 shadow-soft"
      )}
    >
      {/* Day Cell Top: Date number and indicators */}
      <div className="flex items-center justify-between gap-1">
        <Link
          href={queryHref("day", day.dateKey, cleanParams)}
          className={cn(
            "grid size-5 sm:size-6 lg:size-7 place-items-center rounded-full text-[10px] sm:text-[11px] lg:text-xs font-black transition-all duration-fast",
            isToday
              ? "bg-pink text-white shadow-soft ring-2 ring-pink/20 scale-105"
              : day.outsideMonth
              ? "text-secondary/40 hover:bg-ink/5"
              : "text-ink hover:bg-ink hover:text-white"
          )}
          title={isToday ? "Hôm nay" : day.dateKey}
        >
          {day.dayNumber}
        </Link>

        {isToday ? (
          <span className="hidden sm:inline-flex items-center rounded-pill bg-pink/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-pink">
            <LocalizedText vi="Hôm nay" en="Today" />
          </span>
        ) : day.shoots.length > 0 ? (
          <span className="text-[9px] font-black text-secondary/60 pr-0.5 tabular-nums">
            {day.shoots.length}
          </span>
        ) : null}
      </div>

      {/* Day Cell Events List */}
      <div className="mt-1 flex flex-1 flex-col gap-1 min-w-0">
        {day.shoots.slice(0, 2).map((shoot, shootIndex) => {
          const tone = eventTones[(dayIndex + shootIndex) % eventTones.length];
          const dotTone = toneAccentDots[(dayIndex + shootIndex) % toneAccentDots.length];

          return (
            <DraggableShootCard
              key={shoot.id}
              shoot={shoot}
              tone={tone}
              dotTone={dotTone}
              timezone={timezone}
            />
          );
        })}

        {day.shoots.length > 2 ? (
          <Link
            href={queryHref("day", day.dateKey, cleanParams)}
            className="mt-auto block text-center rounded-pill bg-ink/5 hover:bg-ink hover:text-white px-1 py-0.5 text-[7px] sm:text-[8px] lg:text-[9px] font-black leading-none text-secondary transition-colors"
          >
            +{day.shoots.length - 2} <LocalizedText vi="khác" en="more" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function DraggableShootCard({
  shoot,
  tone,
  dotTone,
  timezone,
}: {
  shoot: MonthShootItem;
  tone: string;
  dotTone: string;
  timezone: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shoot-${shoot.id}`,
    data: {
      shootId: shoot.id,
      shootTitle: shoot.title,
      startsAt: shoot.startsAt,
      endsAt: shoot.endsAt,
      tone,
      dotTone,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-30 scale-95"
      )}
    >
      <Link
        href={`/shoots/${shoot.id}`}
        prefetch={true}
        title={`${shoot.title} (${formatTime(shoot.startsAt, timezone)}) — Kéo thả để dời ngày`}
        onClick={(e) => {
          // Cho phép mở trang chi tiết nếu chỉ click chuột bình thường
          if (isDragging) {
            e.preventDefault();
          }
        }}
        className={cn(
          "group/item block w-full min-w-0 rounded-[5px] sm:rounded-r10 px-1 sm:px-1.5 py-0.5 sm:py-1 text-left transition-all duration-fast hover:-translate-y-0.5 hover:shadow-sm active:scale-press",
          tone,
          shoot.isPastOrCompleted ? "opacity-45 grayscale-[35%]" : ""
        )}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className={cn("size-1.5 shrink-0 rounded-full", statusAccent[shoot.status] ?? dotTone)} />
          <span className="truncate text-[8px] sm:text-[9px] lg:text-[10px] font-black leading-tight text-ink">
            {shoot.title}
          </span>
          <span className="ml-auto hidden shrink-0 lg:inline text-[9px] font-black text-ink/60 tabular-nums">
            {formatTime(shoot.startsAt, timezone)}
          </span>
        </div>
      </Link>
    </div>
  );
}
