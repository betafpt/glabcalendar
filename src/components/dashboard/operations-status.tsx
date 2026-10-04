"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown2,
  Box,
  People,
  TaskSquare,
  TickCircle,
  Warning2,
} from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/ui/status-chip";

type OperationsStatusProps = {
  readinessPercent: number;
  checklistCompleted: number;
  checklistTotal: number;
  totalConflicts: number;
  totalCrewConflicts: number;
  totalEquipmentConflicts: number;
  shootsWithConflicts: number;
  totalShoots: number;
};

function MetricCard({
  icon,
  label,
  value,
  note,
  alert = false,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  note: ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-r16 border px-3 py-3 sm:px-4 ${
        alert ? "border-error/25 bg-error/[0.035]" : "border-stroke/65 bg-white/65"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-secondary">{icon}</span>
        <span className={`font-display text-xl font-black ${alert ? "text-error" : "text-ink"}`}>
          {value}
        </span>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-secondary">
        {label}
      </p>
      <div className="mt-0.5 text-[10px] font-extrabold text-secondary">{note}</div>
    </div>
  );
}

export function OperationsStatus({
  readinessPercent,
  checklistCompleted,
  checklistTotal,
  totalConflicts,
  totalCrewConflicts,
  totalEquipmentConflicts,
  shootsWithConflicts,
  totalShoots,
}: OperationsStatusProps) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const checklistReady = checklistTotal > 0 && readinessPercent === 100;
  const allReady = totalConflicts === 0 && checklistReady;

  return (
    <section className="mt-6 rounded-r24 border border-stroke/75 bg-surface/88 p-4 shadow-soft sm:rounded-r28 sm:p-5">
      <button
        type="button"
        className="w-full text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink">
              <LocalizedText vi="TRẠNG THÁI VẬN HÀNH" en="OPERATIONS STATUS" />
            </p>
            <h2 className="mt-0.5 font-display text-xl font-black uppercase tracking-tight text-ink sm:text-2xl">
              <LocalizedText vi="Hôm nay" en="Today" />
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {totalConflicts > 0 ? (
              <StatusChip tone="error">
                <LocalizedText vi={`Cần xử lý · ${totalConflicts}`} en={`Needs attention · ${totalConflicts}`} />
              </StatusChip>
            ) : allReady ? (
              <StatusChip tone="success">
                <LocalizedText vi="Sẵn sàng" en="Ready" />
              </StatusChip>
            ) : (
              <StatusChip tone={readinessPercent >= 75 ? "mint" : "warning"}>
                <LocalizedText vi="Đang chuẩn bị" en="Preparing" />
              </StatusChip>
            )}

            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-stroke/70 bg-white/70 text-ink"
            >
              <ArrowDown2 size="16" variant="Linear" />
            </motion.span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <MetricCard
            icon={<TaskSquare size="18" variant="Bold" />}
            label={<LocalizedText vi="Checklist" en="Checklist" />}
            value={`${readinessPercent}%`}
            note={
              <LocalizedText
                vi={`${checklistCompleted}/${checklistTotal} hoàn tất`}
                en={`${checklistCompleted}/${checklistTotal} done`}
              />
            }
          />
          <MetricCard
            icon={<People size="18" variant="Bold" />}
            label={<LocalizedText vi="Nhân sự" en="Crew" />}
            value={totalCrewConflicts > 0 ? totalCrewConflicts : <TickCircle size="22" variant="Bold" />}
            note={
              totalCrewConflicts > 0 ? (
                <LocalizedText vi="Có trùng lịch" en="Schedule overlap" />
              ) : (
                <span className="text-success"><LocalizedText vi="Sẵn sàng" en="Ready" /></span>
              )
            }
            alert={totalCrewConflicts > 0}
          />
          <MetricCard
            icon={<Box size="18" variant="Bold" />}
            label={<LocalizedText vi="Thiết bị" en="Equipment" />}
            value={totalEquipmentConflicts > 0 ? totalEquipmentConflicts : <TickCircle size="22" variant="Bold" />}
            note={
              totalEquipmentConflicts > 0 ? (
                <LocalizedText vi="Có trùng lịch" en="Schedule overlap" />
              ) : (
                <span className="text-success"><LocalizedText vi="Sẵn sàng" en="Ready" /></span>
              )
            }
            alert={totalEquipmentConflicts > 0}
          />
          <MetricCard
            icon={<Warning2 size="18" variant="Bold" />}
            label={<LocalizedText vi="Xung đột" en="Conflicts" />}
            value={totalConflicts}
            note={
              totalConflicts > 0 ? (
                <LocalizedText vi={`${shootsWithConflicts}/${totalShoots} buổi bị ảnh hưởng`} en={`${shootsWithConflicts}/${totalShoots} shoots affected`} />
              ) : (
                <span className="text-success"><LocalizedText vi="Không có" en="None" /></span>
              )
            }
            alert={totalConflicts > 0}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/8 pt-3">
          <p className="text-[11px] font-bold text-secondary">
            {totalConflicts > 0 ? (
              <LocalizedText vi="Có hạng mục cần kiểm tra trước buổi quay." en="Some items need attention before the shoot." />
            ) : allReady ? (
              <LocalizedText vi="Nhân sự, thiết bị và checklist đã sẵn sàng." en="Crew, equipment and checklist are ready." />
            ) : (
              <LocalizedText vi="Đang hoàn thiện các bước chuẩn bị." en="Preparation is still in progress." />
            )}
          </p>
          <span className="shrink-0 text-[11px] font-black text-ink">
            <LocalizedText vi={expanded ? "Thu gọn" : "Xem chi tiết"} en={expanded ? "Collapse" : "View details"} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-3 border-t border-ink/8 pt-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-r18 border border-stroke/65 bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-secondary">
                    <LocalizedText vi="Tiến độ checklist" en="Checklist progress" />
                  </p>
                  <span className="font-display text-xl font-black text-ink">{readinessPercent}%</span>
                </div>
                <ProgressBar value={readinessPercent} className="mt-3 h-2" />
                <p className="mt-2 text-[11px] font-bold text-secondary">
                  <LocalizedText
                    vi={`${checklistCompleted}/${checklistTotal} mục đã hoàn tất`}
                    en={`${checklistCompleted}/${checklistTotal} items completed`}
                  />
                </p>
              </div>

              <div className={`rounded-r18 border p-4 ${totalConflicts > 0 ? "border-error/25 bg-error/[0.035]" : "border-stroke/65 bg-white/60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-secondary">
                    <LocalizedText vi="Chi tiết xung đột" en="Conflict details" />
                  </p>
                  <span className={`font-display text-xl font-black ${totalConflicts > 0 ? "text-error" : "text-ink"}`}>
                    {totalConflicts}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-r14 bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-bold text-secondary"><LocalizedText vi="Nhân sự" en="Crew" /></p>
                    <p className="mt-0.5 font-display text-lg font-black text-ink">{totalCrewConflicts}</p>
                  </div>
                  <div className="rounded-r14 bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-bold text-secondary"><LocalizedText vi="Thiết bị" en="Equipment" /></p>
                    <p className="mt-0.5 font-display text-lg font-black text-ink">{totalEquipmentConflicts}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-bold text-secondary">
                  {totalConflicts > 0 ? (
                    <LocalizedText vi={`${shootsWithConflicts}/${totalShoots} buổi quay cần kiểm tra.`} en={`${shootsWithConflicts}/${totalShoots} shoots need review.`} />
                  ) : (
                    <LocalizedText vi="Không phát hiện trùng lịch." en="No schedule collisions detected." />
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
