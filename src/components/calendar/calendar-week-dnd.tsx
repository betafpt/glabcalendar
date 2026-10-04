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
import { Location } from "@/components/ui/iconsax";

export type WeekShootItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isPastOrCompleted: boolean;
  projectId?: string | null;
  locationName?: string | null;
};

export type WeekDayColumnData = {
  dateKey: string;
  dayNumber: number;
  isToday: boolean;
  isAnchor: boolean;
  header: { vi: string; en: string; isWeekend: boolean };
  dayIso: string;
  shoots: WeekShootItem[];
};

type CalendarWeekDndProps = {
  columns: WeekDayColumnData[];
  timezone: string;
  cleanParams: Record<string, string | undefined>;
  projectMap: Record<string, string>;
  statusLabels: Record<string, { vi: string; en: string }>;
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

function shootDuration(startsAtIso: string, endsAtIso: string) {
  const durationMs = Math.max(0, new Date(endsAtIso).getTime() - new Date(startsAtIso).getTime());
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
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
  projectName?: string;
};

type ConflictDialogState = {
  shootId: string;
  shootTitle: string;
  newStartsAt: string;
  newEndsAt: string;
  targetDateFormatted: string;
  conflicts: Array<{ type: "crew" | "equipment"; name: string; shootTitle: string }>;
} | null;

export function CalendarWeekDnd({
  columns,
  timezone,
  cleanParams,
  projectMap,
  statusLabels,
}: CalendarWeekDndProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [weekColumns, setWeekColumns] = useState<WeekDayColumnData[]>(columns);
  const [activeShoot, setActiveShoot] = useState<ActiveDragData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictDialogState>(null);

  useEffect(() => {
    setWeekColumns(columns);
  }, [columns]);

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

    const previousColumns = weekColumns;

    // Optimistic update ngay lập tức (0ms UX)
    let movedShoot: WeekShootItem | null = null;
    for (const col of previousColumns) {
      const match = col.shoots.find((s) => s.id === shootId);
      if (match) {
        movedShoot = { ...match, startsAt: newStartIso, endsAt: newEndIso };
        break;
      }
    }

    if (movedShoot) {
      setWeekColumns((current) =>
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
        // Rollback ngay lập tức
        setWeekColumns(previousColumns);

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
            setWeekColumns(previousColumns);
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
      setWeekColumns(previousColumns);
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
        <div className="mt-4 hidden md:grid md:grid-cols-7 divide-x divide-stroke/70 rounded-r22 border border-stroke/70 bg-white/60 overflow-hidden shadow-soft">
          {weekColumns.map((col, colIndex) => (
            <DroppableWeekColumn
              key={col.dateKey}
              column={col}
              colIndex={colIndex}
              timezone={timezone}
              cleanParams={cleanParams}
              projectMap={projectMap}
              statusLabels={statusLabels}
            />
          ))}
        </div>

        {/* Drag Overlay: Hiển thị thẻ quay đang được kéo */}
        <DragOverlay dropAnimation={null}>
          {activeShoot ? (
            <div
              className={cn(
                "pointer-events-none rounded-r14 p-2.5 shadow-nav border border-stroke/80 rotate-2 scale-105 bg-white/95 backdrop-blur-md max-w-[200px]",
                activeShoot.tone
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 min-w-0">
                  <span className={cn("size-1.5 shrink-0 rounded-full", activeShoot.dotTone)} />
                  <span className="truncate text-[9px] font-black text-ink/75 tabular-nums">
                    {formatTime(activeShoot.startsAt, timezone)}
                  </span>
                </span>
                <span className="text-[8px] font-bold text-ink/60 tabular-nums">
                  {shootDuration(activeShoot.startsAt, activeShoot.endsAt)}
                </span>
              </div>
              {activeShoot.projectName ? (
                <p className="mt-1 truncate text-[8px] font-black uppercase tracking-wider text-ink/65">
                  {activeShoot.projectName}
                </p>
              ) : null}
              <h4 className="mt-0.5 font-display text-[11px] font-black uppercase leading-tight tracking-tight text-ink line-clamp-1">
                {activeShoot.shootTitle}
              </h4>
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

function DroppableWeekColumn({
  column,
  colIndex,
  timezone,
  cleanParams,
  projectMap,
  statusLabels,
}: {
  column: WeekDayColumnData;
  colIndex: number;
  timezone: string;
  cleanParams: Record<string, string | undefined>;
  projectMap: Record<string, string>;
  statusLabels: Record<string, { vi: string; en: string }>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-col-${column.dateKey}`,
    data: { dateKey: column.dateKey, dayIso: column.dayIso },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-[380px] lg:min-h-[440px] transition-colors",
        column.isToday
          ? "bg-pink/[0.03]"
          : column.isAnchor
          ? "bg-surface/90"
          : "bg-surface/40 hover:bg-white/60",
        isOver && "ring-2 ring-pink ring-inset bg-pink/[0.12] z-10 shadow-soft"
      )}
    >
      {/* Column Header */}
      <div className="border-b border-stroke/70 p-2 sm:p-2.5 text-center bg-surface/80">
        <p
          className={cn(
            "text-[10px] font-black uppercase tracking-wider",
            column.header.isWeekend ? "text-pink" : "text-secondary"
          )}
        >
          <LocalizedText vi={column.header.vi} en={column.header.en} />
        </p>
        <Link
          href={queryHref("day", column.dateKey, cleanParams)}
          className={cn(
            "mt-1 inline-grid size-7 lg:size-8 place-items-center rounded-full font-display text-base lg:text-lg font-black transition-all hover:scale-110",
            column.isToday
              ? "bg-pink text-white shadow-soft"
              : column.isAnchor
              ? "bg-ink text-white"
              : "text-ink hover:bg-ink hover:text-white"
          )}
        >
          {column.dayNumber}
        </Link>

        <div className="mt-1">
          {column.shoots.length > 0 ? (
            <span className="inline-block rounded-pill bg-ink/5 px-2 py-0.5 text-[9px] font-black text-ink">
              {column.shoots.length}{" "}
              <LocalizedText vi="buổi" en="shoots" />
            </span>
          ) : (
            <span className="inline-block text-[9px] font-bold text-secondary/40">
              <LocalizedText vi="Trống" en="Free" />
            </span>
          )}
        </div>
      </div>

      {/* Column Content: Shoots List */}
      <div className="flex-1 p-1.5 lg:p-2 space-y-1.5 flex flex-col">
        {column.shoots.map((shoot, shootIndex) => {
          const tone = eventTones[(colIndex + shootIndex) % eventTones.length];
          const dotTone = toneAccentDots[(colIndex + shootIndex) % toneAccentDots.length];
          const projectName = shoot.projectId ? projectMap[shoot.projectId] : undefined;

          return (
            <DraggableWeekShootCard
              key={shoot.id}
              shoot={shoot}
              tone={tone}
              dotTone={dotTone}
              timezone={timezone}
              projectName={projectName}
              statusLabels={statusLabels}
            />
          );
        })}

        {column.shoots.length === 0 ? (
          <Link
            href="/shoots"
            className="group flex flex-1 flex-col items-center justify-center rounded-r14 border border-dashed border-stroke/70 p-2 text-center transition-colors hover:border-pink/40 hover:bg-pink/[0.02]"
          >
            <span className="grid size-5 place-items-center rounded-full bg-surface text-secondary text-[10px] font-black group-hover:bg-pink group-hover:text-white transition-colors">
              +
            </span>
            <span className="mt-1 text-[8px] font-bold text-secondary/60 group-hover:text-pink transition-colors">
              <LocalizedText vi="Lên lịch" en="Schedule" />
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function DraggableWeekShootCard({
  shoot,
  tone,
  dotTone,
  timezone,
  projectName,
  statusLabels,
}: {
  shoot: WeekShootItem;
  tone: string;
  dotTone: string;
  timezone: string;
  projectName?: string;
  statusLabels: Record<string, { vi: string; en: string }>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `week-shoot-${shoot.id}`,
    data: {
      shootId: shoot.id,
      shootTitle: shoot.title,
      startsAt: shoot.startsAt,
      endsAt: shoot.endsAt,
      tone,
      dotTone,
      projectName,
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
        title={`${shoot.title} (${formatTime(shoot.startsAt, timezone)} — ${formatTime(shoot.endsAt, timezone)}) — Kéo thả để dời ngày`}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
          }
        }}
        className={cn(
          "group/card block rounded-r14 p-2 transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-press",
          tone,
          shoot.isPastOrCompleted ? "opacity-45 grayscale-[35%]" : ""
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 min-w-0">
            <span className={cn("size-1.5 shrink-0 rounded-full", dotTone)} />
            <span className="truncate text-[9px] font-black text-ink/75 tabular-nums">
              {formatTime(shoot.startsAt, timezone)}
            </span>
          </span>
          <span className="text-[8px] font-bold text-ink/60 tabular-nums">
            {shootDuration(shoot.startsAt, shoot.endsAt)}
          </span>
        </div>

        {projectName ? (
          <p className="mt-1 truncate text-[8px] font-black uppercase tracking-wider text-ink/65">
            {projectName}
          </p>
        ) : null}

        <h4 className="mt-0.5 font-display text-[11px] lg:text-xs font-black uppercase leading-tight tracking-tight text-ink line-clamp-2">
          {shoot.title}
        </h4>

        {shoot.locationName ? (
          <p className="mt-1 flex items-center gap-0.5 text-[8px] font-bold text-ink/70 truncate">
            <Location size={10} className="shrink-0" />
            <span className="truncate">{shoot.locationName}</span>
          </p>
        ) : null}

        <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-ink/10">
          <span className="rounded-pill bg-white/80 px-1.5 py-0.5 text-[7px] lg:text-[8px] font-black uppercase text-ink">
            <LocalizedText
              vi={statusLabels[shoot.status]?.vi ?? shoot.status}
              en={statusLabels[shoot.status]?.en ?? shoot.status}
            />
          </span>
          <span className="text-[10px] text-ink opacity-0 group-hover/card:opacity-100 transition-opacity">
            →
          </span>
        </div>
      </Link>
    </div>
  );
}
