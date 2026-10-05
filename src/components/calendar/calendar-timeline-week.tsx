"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
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

export type TimelineShootItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isPastOrCompleted: boolean;
  projectId?: string | null;
  locationName?: string | null;
  crewNames?: string[];
};

export type TimelineDayData = {
  dateKey: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isAnchor: boolean;
  dayIso: string;
  shoots: TimelineShootItem[];
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

const hourSlots = [
  { hour: 8, label: "8 Am" },
  { hour: 9, label: "9 Am" },
  { hour: 10, label: "10 Am" },
  { hour: 11, label: "11 Am" },
  { hour: 12, label: "12 Pm" },
  { hour: 13, label: "1 Pm" },
  { hour: 14, label: "2 Pm" },
  { hour: 15, label: "3 Pm" },
  { hour: 16, label: "4 Pm" },
  { hour: 17, label: "5 Pm" },
  { hour: 18, label: "6 Pm" },
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

  const [columnsData, setColumnsData] = useState<TimelineDayData[]>(days);
  const [activeShoot, setActiveShoot] = useState<ActiveDragData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictDialogState>(null);

  useEffect(() => {
    setColumnsData(days);
  }, [days]);

  // Current time position calculation (e.g. 10:30 AM)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

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

    const [targetYear, targetMonth, targetDay] = targetDateKey.split("-").map(Number);
    if (!targetYear || !targetMonth || !targetDay) return;

    const oldStart = new Date(currentStartsAt);
    const oldEnd = new Date(currentEndsAt);

    const oldDateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(oldStart);

    if (oldDateKey === targetDateKey) return;

    const durationMs = Math.max(1800_000, oldEnd.getTime() - oldStart.getTime());
    const newStart = new Date(oldStart);
    newStart.setFullYear(targetYear, targetMonth - 1, targetDay);
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

    if (movedShoot) {
      setColumnsData((current) =>
        current.map((col) => {
          if (col.dateKey === oldDateKey) {
            return { ...col, shoots: col.shoots.filter((s) => s.id !== shootId) };
          }
          if (col.dateKey === targetDateKey) {
            return { ...col, shoots: [...col.shoots, movedShoot!] };
          }
          return col;
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
      <section className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-4 sm:p-5 2xl:p-6 shadow-sm calendar-min-h flex flex-col">
        {/* TIMELINE TOP TOOLBAR: PERIOD TITLE, PREV/NEXT, TODAY & + TẠO LỊCH QUAY (Directly above grid) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-black/[0.05] shrink-0">
          <div className="flex items-center gap-3">
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
              className={cn(
                "inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-black transition-all duration-fast active:scale-press",
                isViewingCurrentPeriod
                  ? "bg-pink text-white shadow-soft"
                  : "bg-surface border border-black/[0.06] text-ink hover:bg-white"
              )}
            >
              <LocalizedText vi="Hôm nay" en="Today" />
            </Link>
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

        {/* TIMELINE GRID CONTAINER: GMT+7 & TIME ROW SLOTS & 7-DAY COLUMNS */}
        <div className="mt-4 flex-1 flex flex-col overflow-x-auto [scrollbar-width:thin]">
          <div className="min-w-[720px] flex-1 flex flex-col">
            {/* Header Row: GMT+7 + 7 Days (e.g. 05 Mon, 06 Tue...) */}
            <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] border-b border-black/[0.05] pb-3 shrink-0">
              {/* GMT label */}
              <div className="text-[11px] font-black uppercase text-secondary/70 flex items-center justify-start pl-1">
                GMT+7
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
                      "mt-1 text-[10px] font-bold uppercase tracking-wider",
                      day.isToday ? "text-pink font-black" : "text-secondary"
                    )}
                  >
                    {day.dayName}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Rows: Hour slots and Event Cards */}
            <div className="relative mt-2 flex-1 flex flex-col min-h-[calc(10*var(--calendar-slot-min-height))]">
              {/* Current Time Horizontal Indicator Line (Signature Timeline Feature) */}
              {currentHour >= 8 && currentHour <= 18 && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                  style={{
                    top: `calc(12px + ${(Math.min(600, Math.max(0, (currentHour - 8) * 60 + currentMinute)) / 600).toFixed(4)} * (100% - 24px))`,
                  }}
                >
                  <span className="size-2 rounded-full bg-pink shadow-[0_0_8px_rgba(255,79,154,0.8)]" />
                  <div className="h-[1.5px] w-full bg-pink/60 shadow-sm" />
                </div>
              )}

              {/* Hour Grid Rows (8 Am - 6 Pm) */}
              <div className="flex-1 grid grid-cols-[70px_repeat(7,minmax(0,1fr))]">
                {/* Time markers column */}
                <div className="flex flex-col justify-between py-3 text-left text-[11px] font-extrabold text-secondary/60 select-none">
                  {hourSlots.map((slot) => (
                    <div key={slot.hour} className="leading-none flex items-center">
                      {slot.label}
                    </div>
                  ))}
                </div>

                {/* 7 Columns Drop Zones for Events */}
                {columnsData.map((col, colIdx) => (
                  <DroppableTimelineColumn
                    key={col.dateKey}
                    day={col}
                    colIdx={colIdx}
                    timezone={timezone}
                    projectMap={projectMap}
                  />
                ))}
              </div>
            </div>
          </div>
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
}: {
  day: TimelineDayData;
  colIdx: number;
  timezone: string;
  projectMap: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-col-${day.dateKey}`,
    data: { dateKey: day.dateKey, dayIso: day.dayIso },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col h-full border-l border-stroke/50 px-1.5 py-1 transition-colors",
        day.isToday && "bg-pink/[0.02]",
        isOver && "bg-pink/[0.08] ring-2 ring-pink ring-inset z-10"
      )}
    >
      {/* Background hour divider lines */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-3">
        {hourSlots.map((slot) => (
          <div key={slot.hour} className="h-px w-full bg-stroke/30" />
        ))}
      </div>

      {/* Events inside this day column */}
      <div className="relative z-10 space-y-2 2xl:space-y-3 pt-2">
        {day.shoots.map((shoot, shootIdx) => {
          const tone = eventTones[(colIdx + shootIdx) % eventTones.length];
          const projectName = shoot.projectId ? projectMap[shoot.projectId] : undefined;

          return (
            <DraggableTimelineShootCard
              key={shoot.id}
              shoot={shoot}
              tone={tone}
              timezone={timezone}
              projectName={projectName}
            />
          );
        })}

        {day.shoots.length === 0 ? (
          <div className="h-20" />
        ) : null}
      </div>
    </div>
  );
}

function DraggableTimelineShootCard({
  shoot,
  tone,
  timezone,
  projectName,
}: {
  shoot: TimelineShootItem;
  tone: string;
  timezone: string;
  projectName?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shoot-${shoot.id}`,
    data: {
      shootId: shoot.id,
      shootTitle: shoot.title,
      startsAt: shoot.startsAt,
      endsAt: shoot.endsAt,
      tone,
      projectName,
      crewNames: shoot.crewNames,
    },
  });

  const timeLabel = `${formatTimeSlot(shoot.startsAt, timezone)} - ${formatTimeSlot(shoot.endsAt, timezone)}`;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none transition-all duration-fast",
        isDragging && "opacity-25 scale-95"
      )}
    >
      <Link
        href={`/shoots/${shoot.id}`}
        className={cn(
          "group block rounded-[16px] p-3 2xl:p-3.5 transition-all duration-fast hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98]",
          tone
        )}
      >
        {/* Project Name or Shoot Title */}
        <p className="truncate text-[9px] font-black uppercase tracking-wider opacity-75">
          {projectName || "G.Lab Shoot"}
        </p>

        <h4 className="mt-0.5 font-display text-[12px] font-black uppercase leading-tight tracking-tight line-clamp-2">
          {shoot.title}
        </h4>

        {/* Time slot */}
        <p className="mt-1.5 text-[10px] font-extrabold opacity-75 tabular-nums">
          {timeLabel}
        </p>

        {/* Crew Avatar Stack (Max 3 + "+N" badge - Reference-identical!) */}
        <div className="mt-2.5 flex items-center justify-between gap-1 pt-1.5 border-t border-black/5">
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
              <span className="text-[9px] font-bold opacity-60">Chưa xếp ekip</span>
            )}
          </div>

          {/* Status Dot */}
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
      </Link>
    </div>
  );
}
