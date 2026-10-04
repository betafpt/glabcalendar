"use client";

import Link from "next/link";
import { LocalizedText } from "@/components/ui/localized-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/ui/status-chip";
import type { ShootReadinessSummary } from "@/server/services/shoot-readiness";
import { motion, useReducedMotion } from "motion/react";

export function ShootReadinessSummaryCard({
  readiness,
}: {
  readiness: ShootReadinessSummary;
}) {
  const isCancelled = readiness.isCancelled;
  const hasConflicts = readiness.hasConflicts;
  const isReady = readiness.isReady;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.08, ease: "easeOut" }}
      className={`rounded-r22 border p-3 sm:p-4 transition-colors ${
        isCancelled
          ? "border-ink/10 bg-surface/80"
          : hasConflicts
          ? "border-error/20 bg-error/[0.035]"
          : "border-stroke/75 bg-white/55"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-secondary">
            <LocalizedText vi="CHECKLIST" en="CHECKLIST" />
          </p>
          <motion.p
            key={readiness.readinessPercent}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-black leading-none tracking-[-.04em] text-ink sm:text-3xl"
          >
            {readiness.readinessPercent}%
          </motion.p>
        </div>

        <div className="flex items-center gap-2">
          {isCancelled ? (
            <StatusChip tone="error">
              <LocalizedText vi="ĐÃ HỦY" en="CANCELLED" />
            </StatusChip>
          ) : hasConflicts ? (
            <StatusChip tone="error">
              {readiness.conflictCount}{" "}
              <LocalizedText
                vi="xung đột"
                en={readiness.conflictCount === 1 ? "conflict" : "conflicts"}
              />
            </StatusChip>
          ) : isReady ? (
            <StatusChip tone="success">
              <LocalizedText vi="100% Sẵn sàng" en="100% Ready" />
            </StatusChip>
          ) : readiness.checklistTotal === 0 ? (
            <StatusChip tone="warning">
              <LocalizedText vi="Chưa có checklist" en="No checklist" />
            </StatusChip>
          ) : (
            <StatusChip tone="mint">
              <LocalizedText vi="Đang chuẩn bị" en="In prep" />
            </StatusChip>
          )}
        </div>
      </div>

      {/* Progress Bar & Ratio */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.1em] text-secondary">
          <span>
            {readiness.checklistTotal > 0 ? (
              <>
                {readiness.checklistCompleted} / {readiness.checklistTotal}{" "}
                <LocalizedText vi="mục hoàn tất" en="items complete" />
              </>
            ) : (
              <LocalizedText vi="Chưa có mục checklist" en="No checklist items" />
            )}
          </span>
          <span>{readiness.readinessPercent}%</span>
        </div>
        <ProgressBar
          value={readiness.readinessPercent}
          className="mt-1.5 h-1.5 bg-ink/10"
        />
      </div>

      {/* 3 Pillars: Checklist, Crew, Gear */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* Checklist Pillar */}
        <motion.div whileHover={reduceMotion ? undefined : { y: -1 }} className="rounded-r14 border border-ink/5 bg-white/60 p-2.5">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-secondary">
            <LocalizedText vi="CHECKLIST" en="CHECKLIST" />
          </p>
          <p className="mt-0.5 text-xs font-black text-ink">
            {readiness.checklistTotal > 0 ? (
              `${readiness.checklistCompleted}/${readiness.checklistTotal}`
            ) : (
              <LocalizedText vi="0 mục" en="0 items" />
            )}
          </p>
          <p className="mt-0.5 text-[10px] font-bold">
            {readiness.checklistTotal === 0 ? (
              <span className="text-secondary/60">
                <LocalizedText vi="Chưa thêm mục" en="No items added" />
              </span>
            ) : readiness.checklistCompleted === readiness.checklistTotal ? (
              <span className="text-success">
                ✓ <LocalizedText vi="Đã hoàn tất" en="Completed" />
              </span>
            ) : (
              <span className="text-secondary">
                <LocalizedText
                  vi={`Còn ${readiness.checklistTotal - readiness.checklistCompleted} mục`}
                  en={`${readiness.checklistTotal - readiness.checklistCompleted} remaining`}
                />
              </span>
            )}
          </p>
        </motion.div>

        {/* Crew Pillar */}
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -1 }}
          className={`rounded-r16 border p-2.5 ${
            readiness.crewConflictCount > 0
              ? "border-error/30 bg-error/10"
              : "border-ink/5 bg-white/70"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-secondary">
            <LocalizedText vi="NHÂN SỰ" en="CREW" />
          </p>
          <p className="mt-0.5 text-xs font-black text-ink">
            {readiness.crewCount}{" "}
            <LocalizedText
              vi="thành viên"
              en={readiness.crewCount === 1 ? "member" : "members"}
            />
          </p>
          <p className="mt-0.5 text-[10px] font-bold">
            {isCancelled ? (
              <span className="text-secondary/60">
                <LocalizedText vi="Đã hủy" en="Cancelled" />
              </span>
            ) : readiness.crewConflictCount > 0 ? (
              <span className="text-error font-extrabold">
                ⚠ {readiness.crewConflictCount}{" "}
                <LocalizedText
                  vi="xung đột"
                  en={readiness.crewConflictCount === 1 ? "conflict" : "conflicts"}
                />
              </span>
            ) : readiness.crewCount === 0 ? (
              <span className="text-secondary/60">
                <LocalizedText vi="Chưa phân công" en="None assigned" />
              </span>
            ) : (
              <span className="text-success">
                ✓ <LocalizedText vi="Không trùng lịch" en="Clear" />
              </span>
            )}
          </p>
        </motion.div>

        {/* Gear Pillar */}
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -1 }}
          className={`rounded-r16 border p-2.5 ${
            readiness.equipmentConflictCount > 0
              ? "border-error/30 bg-error/10"
              : "border-ink/5 bg-white/70"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-secondary">
            <LocalizedText vi="THIẾT BỊ" en="GEAR" />
          </p>
          <p className="mt-0.5 text-xs font-black text-ink">
            {readiness.equipmentCount}{" "}
            <LocalizedText
              vi="thiết bị"
              en={readiness.equipmentCount === 1 ? "item" : "items"}
            />
          </p>
          <p className="mt-0.5 text-[10px] font-bold">
            {isCancelled ? (
              <span className="text-secondary/60">
                <LocalizedText vi="Đã hủy" en="Cancelled" />
              </span>
            ) : readiness.equipmentConflictCount > 0 ? (
              <span className="text-error font-extrabold">
                ⚠ {readiness.equipmentConflictCount}{" "}
                <LocalizedText
                  vi="xung đột"
                  en={readiness.equipmentConflictCount === 1 ? "conflict" : "conflicts"}
                />
              </span>
            ) : readiness.equipmentCount === 0 ? (
              <span className="text-secondary/60">
                <LocalizedText vi="Chưa đặt thiết bị" en="None booked" />
              </span>
            ) : (
              <span className="text-success">
                ✓ <LocalizedText vi="Không trùng lịch" en="Clear" />
              </span>
            )}
          </p>
        </motion.div>
      </div>

      {/* Conflict Details Alert */}
      {hasConflicts && !isCancelled ? (
        <div className="mt-3 rounded-r20 border border-error/25 bg-white/90 p-3 text-xs text-ink shadow-xs">
          <p className="font-extrabold text-error">
            ⚠ <LocalizedText vi="Phát hiện xung đột lịch trình:" en="Scheduling conflicts detected:" />
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] font-semibold text-secondary">
            {readiness.crewConflicts.flatMap((group) =>
              group.conflicts.map((conflict) => (
                <li
                  key={`crew-${group.crewMemberId}-${conflict.shootId}`}
                  className="flex flex-wrap items-center gap-1"
                >
                  <span className="font-bold text-ink">{group.crewMemberName || <LocalizedText vi="Nhân sự" en="Crew" />}:</span>
                  <span><LocalizedText vi="trùng với" en="overlaps with" /></span>
                  <Link
                    href={`/shoots/${conflict.shootId}`}
                    className="font-bold text-error underline hover:text-pink transition"
                  >
                    {conflict.title}
                  </Link>
                </li>
              ))
            )}
            {readiness.equipmentConflicts.flatMap((group) =>
              group.conflicts.map((conflict) => (
                <li
                  key={`eq-${group.equipmentItemId}-${conflict.shootId}`}
                  className="flex flex-wrap items-center gap-1"
                >
                  <span className="font-bold text-ink">{group.equipmentItemName || <LocalizedText vi="Thiết bị" en="Gear" />}:</span>
                  <span><LocalizedText vi="trùng với" en="overlaps with" /></span>
                  <Link
                    href={`/shoots/${conflict.shootId}`}
                    className="font-bold text-error underline hover:text-pink transition"
                  >
                    {conflict.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {/* Cancelled Notice */}
      {isCancelled ? (
        <div className="mt-3 rounded-r20 border border-error/20 bg-white/80 p-3 text-xs font-semibold text-secondary">
          <LocalizedText
            vi="Buổi quay này đã bị hủy. Lịch trình và phân công tài nguyên đã dừng hiệu lực."
            en="This shoot has been cancelled. Scheduling and resource commitments are inactive."
          />
        </div>
      ) : null}
    </motion.div>
  );
}
