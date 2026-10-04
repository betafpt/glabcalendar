"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Warning2, TickCircle, CloseCircle, ArrowRight2 } from "@/components/ui/iconsax";
import type { AIProposal } from "@/server/ai/types";
import { confirmAIProposalAction, cancelAIProposalAction } from "@/app/ai/actions";

interface ProposalConfirmationCardProps {
  proposal: AIProposal;
  onCompleted?: (resultMessage: string) => void;
}

export function ProposalConfirmationCard({ proposal, onCompleted }: ProposalConfirmationCardProps) {
  const [status, setStatus] = useState<"pending" | "confirming" | "cancelling" | "confirmed" | "cancelled">("pending");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStatus("confirming");
    const res = await confirmAIProposalAction(proposal.id);
    if (res.ok) {
      setStatus("confirmed");
      setFeedback(res.message);
      onCompleted?.(res.message);
    } else {
      setStatus("pending");
      setFeedback(res.message);
    }
  };

  const handleCancel = async () => {
    setStatus("cancelling");
    const res = await cancelAIProposalAction(proposal.id);
    setStatus("cancelled");
    setFeedback(res.message);
    onCompleted?.(res.message);
  };

  const isCreate = proposal.actionType === "create_shoot";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`overflow-hidden rounded-r22 border bg-surface shadow-soft ${
        status === "confirmed"
          ? "border-emerald-300"
          : status === "cancelled"
          ? "border-stroke/60 opacity-70"
          : "border-pink/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke/60 bg-pink/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-black uppercase tracking-wider text-pink">
            {isCreate ? "ĐỀ XUẤT TẠO LỊCH QUAY" : "ĐỀ XUẤT DỜI / CẬP NHẬT LỊCH"}
          </span>
        </div>
        <span className="rounded-pill bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink shadow-xs">
          Cần xác nhận
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display text-sm font-bold text-ink">{proposal.title}</h3>
          <p className="mt-0.5 text-xs text-secondary">{proposal.summaryVi}</p>
        </div>

        {/* Multi-field Diff Preview */}
        <div className="rounded-r16 border border-stroke/60 bg-bg/70 p-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-secondary">
            CHI TIẾT THAY ĐỔI
          </p>
          <div className="space-y-1.5 divide-y divide-stroke/30">
            {proposal.diff.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 pt-1.5 text-xs first:pt-0">
                <span className="font-medium text-secondary/90 w-24 shrink-0">{d.labelVi}:</span>
                <div className="flex-1 flex items-center justify-end gap-1.5 text-right font-medium">
                  {d.oldValue ? (
                    <>
                      <span className="text-secondary/70 line-through text-[11px]">{d.oldValue}</span>
                      <ArrowRight2 size={12} className="text-pink shrink-0" />
                      <span className="text-ink font-bold">{d.newValue}</span>
                    </>
                  ) : (
                    <span className="text-ink font-bold">{d.newValue}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conflict Status */}
        {proposal.hasConflicts ? (
          <div className="rounded-r14 border border-amber-300 bg-amber-50/70 p-3">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
              <Warning2 size={15} className="text-amber-600 shrink-0" />
              <span>Phát hiện {proposal.conflictCount} xung đột lịch:</span>
            </div>
            <div className="mt-1 space-y-1 pl-5 text-[11px] text-amber-900/90">
              {proposal.conflicts.map((c, idx) => (
                <p key={idx}>
                  • <strong className="font-bold">{c.targetName}</strong> ({c.type === "crew" ? "Ekip" : "Thiết bị"}) trùng lịch với <em>{c.conflictingShootTitle}</em> ({c.timeRange})
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-r14 border border-emerald-200/80 bg-emerald-50/60 p-2.5 text-xs font-bold text-emerald-800">
            <TickCircle size={15} className="text-emerald-600 shrink-0" />
            <span>✓ Không phát hiện xung đột lịch nào.</span>
          </div>
        )}

        {/* Post-action feedback */}
        {feedback && (
          <p
            className={`text-xs font-semibold p-2 rounded-r12 ${
              status === "confirmed"
                ? "bg-emerald-100/70 text-emerald-800"
                : status === "cancelled"
                ? "bg-bg text-secondary"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {feedback}
          </p>
        )}

        {/* Confirmation Gate Buttons */}
        {status === "pending" && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-pill border border-stroke bg-surface px-4 py-2 text-xs font-bold text-secondary transition hover:bg-bg active:scale-press"
            >
              <CloseCircle size={15} />
              <span>Hủy</span>
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-pill bg-pink px-4 py-2 text-xs font-bold text-ink shadow-soft transition hover:opacity-90 active:scale-press"
            >
              <TickCircle size={15} variant="Bold" />
              <span>Xác nhận thay đổi</span>
            </button>
          </div>
        )}

        {status === "confirming" && (
          <p className="text-center text-xs font-bold text-pink animate-pulse py-1">
            Đang thực thi và đồng bộ lịch...
          </p>
        )}

        {status === "cancelling" && (
          <p className="text-center text-xs font-bold text-secondary py-1">
            Đang hủy yêu cầu...
          </p>
        )}

        {status === "confirmed" && (
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 py-1">
            <TickCircle size={16} variant="Bold" />
            <span>ĐÃ THỰC THI THÀNH CÔNG</span>
          </div>
        )}

        {status === "cancelled" && (
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-secondary py-1">
            <CloseCircle size={16} />
            <span>ĐÃ HỦY (0 DỮ LIỆU BỊ THAY ĐỔI)</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
