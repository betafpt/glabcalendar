"use client";

import type { ShootChecklistItem } from "@/server/db/schema";
import type { ShootCrewOption } from "@/server/shoot-detail-options";
import type { ShootReadinessSummary } from "@/server/services/shoot-readiness";
import { Avatar } from "@/components/ui/avatar";
import { fieldClass } from "@/components/ui/form-styles";
import { LocalizedText } from "@/components/ui/localized-text";
import { TaskSquare, Camera, VideoPlay, Box, Profile, DocumentText, TickCircle } from "@/components/ui/iconsax";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useLanguage } from "@/components/language-provider";
import { addChecklistItemAction, removeChecklistItemAction, toggleChecklistItemAction } from "./checklist-actions";
import { ShootReadinessSummaryCard } from "./shoot-readiness-summary";

import { useState, useEffect, useTransition } from "react";
import { ArrowDown2, ArrowUp2 } from "@/components/ui/iconsax";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useToast } from "@/components/ui/toast";

export function ShootChecklist({
  shootId,
  items,
  crew,
  readiness,
  canManage,
}: {
  shootId: string;
  items: ShootChecklistItem[];
  crew: ShootCrewOption[];
  readiness?: ShootReadinessSummary | null;
  canManage: boolean;
}) {
  const { locale } = useLanguage();
  const { showToast } = useToast();
  const [checklistItems, setChecklistItems] = useState<ShootChecklistItem[]>(items);
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  // Sync prop changes from server revalidation
  useEffect(() => {
    setChecklistItems(items);
  }, [items]);

  const completed = checklistItems.filter((item) => item.isCompleted).length;
  const progress = checklistItems.length ? Math.round((completed / checklistItems.length) * 100) : 0;
  const hasManyItems = checklistItems.length > 4;
  const visibleItems = hasManyItems && !isExpanded ? checklistItems.slice(0, 4) : checklistItems;

  const handleToggle = async (itemId: string, nextStatus: boolean) => {
    const prevItems = checklistItems;
    // Optimistic update 0ms
    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, isCompleted: nextStatus } : item))
    );

    startTransition(async () => {
      try {
        const res = await toggleChecklistItemAction(shootId, itemId, nextStatus);
        if (!res?.ok) {
          setChecklistItems(prevItems);
          showToast({
            message:
              locale === "vi"
                ? "Không thể cập nhật mục checklist."
                : "Failed to update checklist item.",
            undoLabel: locale === "vi" ? "Thử lại" : "Retry",
            onUndo: () => handleToggle(itemId, nextStatus),
          });
        }
      } catch {
        setChecklistItems(prevItems);
        showToast({
          message:
            locale === "vi"
              ? "Không thể cập nhật mục checklist."
              : "Failed to update checklist item.",
          undoLabel: locale === "vi" ? "Thử lại" : "Retry",
          onUndo: () => handleToggle(itemId, nextStatus),
        });
      }
    });
  };

  const handleRemove = async (itemId: string) => {
    const prevItems = checklistItems;
    // Optimistic removal 0ms
    setChecklistItems((current) => current.filter((item) => item.id !== itemId));

    startTransition(async () => {
      try {
        const res = await removeChecklistItemAction(shootId, itemId);
        if (!res?.ok) {
          setChecklistItems(prevItems);
          showToast({
            message:
              locale === "vi"
                ? "Không thể xóa mục checklist."
                : "Failed to remove checklist item.",
            undoLabel: locale === "vi" ? "Thử lại" : "Retry",
            onUndo: () => handleRemove(itemId),
          });
        }
      } catch {
        setChecklistItems(prevItems);
        showToast({
          message:
            locale === "vi"
              ? "Không thể xóa mục checklist."
              : "Failed to remove checklist item.",
          undoLabel: locale === "vi" ? "Thử lại" : "Retry",
          onUndo: () => handleRemove(itemId),
        });
      }
    });
  };

  const handleAddSubmit = async (formData: FormData) => {
    const formElement = document.getElementById("add-checklist-form") as HTMLFormElement | null;
    formElement?.reset();
    startTransition(async () => {
      const res = await addChecklistItemAction(shootId, formData);
      if (!res?.ok) {
        showToast({
          message:
            locale === "vi"
              ? "Không thể thêm mục checklist."
              : "Failed to add checklist item.",
        });
      }
    });
  };

  return (
    <section>
      {readiness ? (
        <ShootReadinessSummaryCard readiness={readiness} />
      ) : (
        <div className="rounded-r28 bg-mint p-4 sm:p-5 shadow-soft">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.16em] text-ink/80">
                <LocalizedText vi="MỨC ĐỘ SẴN SÀNG" en="PRODUCTION READINESS" />
              </p>
              <p className="mt-1 font-display text-[3.8rem] font-black leading-[.74] tracking-[-.065em] sm:text-[4.6rem]">
                {progress}%
              </p>
            </div>
            <div className="min-w-[150px] flex-1 pb-1 sm:max-w-xs">
              <div className="flex justify-end text-[10px] font-black uppercase tracking-[.1em] text-secondary">
                {completed} / {checklistItems.length} <LocalizedText vi="hoàn tất" en="complete" />
              </div>
              <ProgressBar value={progress} className="mt-2 h-2.5 bg-ink/10" />
            </div>
            <span className="hidden text-5xl font-black text-pink sm:block">*</span>
          </div>
        </div>
      )}

      {canManage ? (
        <form
          id="add-checklist-form"
          action={handleAddSubmit}
          className="mt-3 grid gap-2 rounded-r22 border border-stroke bg-surface p-2.5 sm:grid-cols-[1fr_200px_auto] sm:items-center"
        >
          <div>
            <label htmlFor="checklist-title" className="sr-only">
              <LocalizedText vi="Mục checklist" en="Checklist item" />
            </label>
            <input
              id="checklist-title"
              name="title"
              required
              placeholder={locale === "vi" ? "Thêm mục checklist..." : "Add checklist item..."}
              className={`${fieldClass} mt-0`}
            />
          </div>
          <div>
            <label htmlFor="checklist-assignee" className="sr-only">
              <LocalizedText vi="Người phụ trách" en="Assignee" />
            </label>
            <select
              id="checklist-assignee"
              name="assignedCrewMemberId"
              className={`${fieldClass} mt-0`}
              defaultValue=""
            >
              <option value="">{locale === "vi" ? "Chưa giao người" : "No assignee"}</option>
              {crew.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.defaultRole ? ` (${member.defaultRole})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-[.1em] text-white transition duration-fast hover:bg-pink active:scale-press disabled:opacity-60"
          >
            <LocalizedText vi="Thêm" en="Add" />
          </button>
        </form>
      ) : null}

      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {visibleItems.map((item, index) => {
            const assignee = crew.find((member) => member.id === item.assignedCrewMemberId);
            const itemTones = ["bg-surface", "bg-white", "bg-surface", "bg-white"];
            const icons = [
              <TaskSquare key="task" size={16} variant="Linear" className="text-pink" />,
              <Camera key="cam" size={16} variant="Linear" className="text-ink" />,
              <VideoPlay key="vid" size={16} variant="Linear" className="text-ink" />,
              <Box key="box" size={16} variant="Linear" className="text-secondary" />,
              <Profile key="prof" size={16} variant="Linear" className="text-ink" />,
              <DocumentText key="doc" size={16} variant="Linear" className="text-pink" />,
            ];
            return (
              <motion.div
                key={item.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.18, delay: Math.min(index, 4) * 0.035 }
                }
                className={`group flex items-center justify-between gap-3 rounded-r22 border border-ink/5 p-3 transition duration-fast hover:border-ink/15 ${itemTones[index % itemTones.length]}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id, !item.isCompleted)}
                      aria-label={
                        locale === "vi"
                          ? item.isCompleted
                            ? "Đánh dấu chưa hoàn tất"
                            : "Đánh dấu hoàn tất"
                          : item.isCompleted
                            ? "Mark incomplete"
                            : "Mark complete"
                      }
                      className={`grid size-11 place-items-center rounded-r10 border text-sm font-black transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press ${
                        item.isCompleted
                          ? "border-success bg-success text-white"
                          : "border-ink/20 bg-white text-transparent hover:border-ink/40"
                      }`}
                    >
                      <TickCircle size={18} variant="Bold" />
                    </button>
                  ) : (
                    <div
                      className={`grid size-11 place-items-center rounded-r10 border text-sm font-black ${item.isCompleted ? "border-success bg-success text-white" : "border-ink/20 bg-white text-transparent"}`}
                    >
                      <TickCircle size={18} variant="Bold" />
                    </div>
                  )}
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm shadow-[inset_0_0_0_1px_rgba(9,9,9,.08)]">
                    {icons[index % icons.length]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-black leading-snug ${item.isCompleted ? "text-secondary/60 line-through" : "text-ink"}`}
                    >
                      {item.title}
                    </p>
                    {assignee ? (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Avatar
                          initials={assignee.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")}
                          className="size-5 text-[8px]"
                        />
                        <p className="truncate text-[11px] font-semibold text-secondary">
                          {assignee.name}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-[11px] font-semibold text-secondary/60">
                        <LocalizedText vi="Chưa giao người phụ trách" en="No assignee" />
                      </p>
                    )}
                  </div>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    aria-label={locale === "vi" ? "Xóa mục checklist" : "Remove checklist item"}
                    className="grid size-11 place-items-center rounded-full bg-white/80 text-sm font-bold text-secondary/70 transition duration-fast hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
                  >
                    ✕
                  </button>
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hasManyItems ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-r18 border border-stroke/70 bg-surface/80 py-2 px-4 text-xs font-bold text-secondary transition hover:bg-white hover:text-ink active:scale-press"
          >
            {isExpanded ? (
              <>
                <ArrowUp2 size={14} variant="Linear" />
                <LocalizedText vi="Thu gọn checklist" en="Collapse checklist" />
              </>
            ) : (
              <>
                <ArrowDown2 size={14} variant="Linear" />
                <LocalizedText
                  vi={`Xem thêm ${checklistItems.length - 4} mục checklist khác`}
                  en={`Show ${checklistItems.length - 4} more checklist items`}
                />
              </>
            )}
          </button>
        ) : null}

        {!items.length ? (
          <div className="rounded-r22 border border-dashed border-ink/15 bg-surface p-6 text-center text-sm font-semibold text-secondary">
            <LocalizedText vi="Chưa có checklist. Hãy thêm các bước cần hoàn tất cho buổi quay." en="No checklist yet. Add the steps required for this shoot." />
          </div>
        ) : null}
      </div>
    </section>
  );
}
