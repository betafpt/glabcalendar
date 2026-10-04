"use client";

import React, { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ShootCrewAssignment } from "@/server/db/schema";
import type { ShootCrewOption } from "@/server/shoot-detail-options";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Profile2User, Warning2, TickCircle, CloseCircle } from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConflictList } from "@/components/scheduling/conflict-list";
import { fieldClass, labelClass } from "@/components/ui/form-styles";
import { useLanguage } from "@/components/language-provider";
import {
  assignCrewAction,
  removeCrewAssignmentAction,
  type ResourceActionState,
} from "./resource-actions";
import { respondToShootAssignmentAction } from "./assignee-actions";

export type AccountAssigneeRow = {
  assignee: {
    id: string;
    userId: string;
    role: string | null;
    status: "pending" | "accepted" | "declined";
    assignedBy: string | null;
  };
  user: { id: string; name: string | null; email: string; image: string | null };
};

type CrewRow = { assignment: ShootCrewAssignment; crewMember: ShootCrewOption };
const initialState: ResourceActionState = { ok: false };

function SubmitButton({ vi, en }: { vi: string; en: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-ink px-5 text-xs font-black uppercase tracking-[.1em] text-white transition duration-fast hover:bg-pink active:scale-press disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <LocalizedText vi="ĐANG LƯU..." en="SAVING..." /> : <LocalizedText vi={vi} en={en} />}
    </button>
  );
}

export function CrewAssignmentSection({
  shootId,
  crew,
  crewAssignments,
  conflictCount = 0,
  accountAssignees,
  currentUserId,
  canManage,
}: {
  shootId: string;
  crew: ShootCrewOption[];
  crewAssignments: CrewRow[];
  conflictCount?: number;
  accountAssignees: AccountAssigneeRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  const { locale } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [isResponding, startTransition] = useTransition();
  const [responseFeedback, setResponseFeedback] = React.useState<string | null>(null);
  const [crewState, crewAction] = useFormState(assignCrewAction.bind(null, shootId), initialState);
  const currentAssignment = accountAssignees.find((row) => row.user.id === currentUserId)?.assignee;
  const assigneeByUserId = new Map(accountAssignees.map((row) => [row.user.id, row]));
  const respond = (decision: "accepted" | "declined") => {
    startTransition(async () => {
      const result = await respondToShootAssignmentAction(shootId, decision);
      setResponseFeedback(result.message);
    });
  };
  const crewFeedback =
    locale === "vi"
      ? crewState.messageVi ?? crewState.message
      : crewState.messageEn ?? crewState.message;

  const hasConflicts = conflictCount > 0 || Boolean(crewState.conflicts?.length);

  // Lấy danh sách tối đa 3 initials
  const topCrew = crewAssignments.slice(0, 3);
  const remainingCount = crewAssignments.length - 3;

  // Lấy các vai trò chính (deduplicate)
  const mainRoles = Array.from(
    new Set(
      crewAssignments
        .map(
          ({ assignment, crewMember }) =>
            assignment.role?.trim() ||
            crewMember.defaultRole?.trim() ||
            (locale === "vi" ? "Nhân sự" : "Crew")
        )
        .filter(Boolean)
    )
  );

  return (
    <AccordionItem
      value="crew"
      className="overflow-hidden border border-stroke/90 bg-coral/25 transition-all duration-200"
    >
      <AccordionTrigger className="p-4 sm:p-5 hover:bg-black/[0.02]">
        <div className="flex flex-col gap-3">
          {/* Top Row: Icon + Section Title + Count & Conflict Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-r14 bg-pink/20 text-ink">
                <Profile2User size={18} variant="Linear" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-secondary">
                  <LocalizedText vi="NHÂN SỰ" en="CREW" />
                </p>
                <h3 className="font-display text-lg sm:text-xl font-black uppercase leading-tight tracking-tight text-ink">
                  <LocalizedText vi="Phân công ekip" en="Assign crew" />
                  <span className="text-pink">*</span>
                </h3>
              </div>
            </div>

            {/* Badges / Alerts */}
            <div className="flex flex-wrap items-center gap-2">
              {hasConflicts ? (
                <Badge variant="coral" className="gap-1 border-error/30 bg-coral text-error shadow-sm font-black animate-pulse">
                  <Warning2 size={13} variant="Bold" />
                  <LocalizedText vi="Có xung đột" en="Conflict detected" />
                </Badge>
              ) : null}

              {crewAssignments.length > 0 ? (
                <Badge variant="outline" className="bg-surface font-black text-ink">
                  {crewAssignments.length} <LocalizedText vi="thành viên" en="assigned" />
                </Badge>
              ) : (
                <Badge variant="yellow" className="gap-1">
                  <Warning2 size={12} variant="Bold" />
                  <LocalizedText vi="Chưa phân công ekip" en="No crew assigned" />
                </Badge>
              )}
            </div>
          </div>

          {/* Summary Details Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-secondary">
            {crewAssignments.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                {/* 3 Avatars Stack */}
                <div className="flex items-center -space-x-2">
                  {topCrew.map(({ assignment, crewMember }) => {
                    const initials = crewMember.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("");
                    return (
                      <Avatar
                        key={assignment.id}
                        initials={initials}
                        className="size-7 border-2 border-surface text-[10px] shadow-xs"
                      />
                    );
                  })}
                  {remainingCount > 0 ? (
                    <div className="grid size-7 place-items-center rounded-full border-2 border-surface bg-ink text-[9px] font-black text-white shadow-xs">
                      +{remainingCount}
                    </div>
                  ) : null}
                </div>

                {/* Main Roles List */}
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-ink truncate">
                    {mainRoles.slice(0, 3).join(", ")}
                    {mainRoles.length > 3 ? "..." : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-secondary italic">
                <LocalizedText vi="Chưa phân công ekip" en="No crew members assigned yet" />
              </p>
            )}

            {/* Quick summary members names preview */}
            {crewAssignments.length > 0 ? (
              <span className="text-[11px] text-secondary/80">
                {crewAssignments.slice(0, 2).map((a) => a.crewMember.name).join(", ")}
                {crewAssignments.length > 2 ? `, +${crewAssignments.length - 2}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      </AccordionTrigger>

      {/* Expanded Content: Form & List */}
      <AccordionContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="border-t border-stroke/70 pt-4 space-y-4">
          <AnimatePresence initial={false}>
            {currentAssignment?.status === "pending" ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-r22 border border-pink/25 bg-pink/10 p-4"
              >
                <p className="text-sm font-black text-ink">
                  <LocalizedText vi="Bạn được mời tham gia buổi quay này" en="You are assigned to this shoot" />
                </p>
                <p className="mt-1 text-xs font-semibold text-secondary">
                  <LocalizedText vi="Xác nhận để người tạo lịch biết bạn có tham gia hay không." en="Reply so the organizer knows whether you can join." />
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={isResponding} onClick={() => respond("accepted")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-ink px-4 text-xs font-black text-white transition hover:bg-pink active:scale-press disabled:opacity-50">
                    <TickCircle size={16} variant="Bold" /><LocalizedText vi="Xác nhận" en="Accept" />
                  </button>
                  <button type="button" disabled={isResponding} onClick={() => respond("declined")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-error/25 bg-white px-4 text-xs font-black text-error transition hover:bg-error/10 active:scale-press disabled:opacity-50">
                    <CloseCircle size={16} variant="Bold" /><LocalizedText vi="Từ chối" en="Decline" />
                  </button>
                </div>
                {responseFeedback ? <p className="mt-2 text-xs font-bold text-secondary">{responseFeedback}</p> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Assignment Form */}
          {canManage ? (
          <form action={crewAction} className="space-y-3 rounded-r22 bg-surface/95 p-4 shadow-soft border border-stroke/70">
            <div>
              <label htmlFor="crew-member" className={labelClass}>
                <LocalizedText vi="Thành viên" en="Crew member" />
              </label>
              <select
                id="crew-member"
                name="crewMemberId"
                required
                className={`${fieldClass} border-0 bg-white`}
                defaultValue=""
              >
                <option value="" disabled>
                  {locale === "vi" ? "Chọn thành viên ekip" : "Select crew member"}
                </option>
                {crew
                  .filter((member) => member.status === "active")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.defaultRole ? ` — ${member.defaultRole}` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="crew-role" className={labelClass}>
                <LocalizedText vi="Vai trò" en="Role" />
              </label>
              <input
                id="crew-role"
                name="role"
                placeholder={
                  locale === "vi"
                    ? "Đạo diễn hình ảnh (DOP)..."
                    : "Director of Photography"
                }
                className={`${fieldClass} border-0 bg-white`}
              />
            </div>
            <div>
              <label htmlFor="crew-account-email" className={labelClass}>
                <LocalizedText vi="Tài khoản G.Lab (không bắt buộc)" en="G.Lab account (optional)" />
              </label>
              <input
                id="crew-account-email"
                name="accountEmail"
                type="email"
                autoComplete="off"
                placeholder="name@gmail.com"
                className={fieldClass + " border-0 bg-white"}
              />
              <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-secondary">
                <LocalizedText
                  vi="Chỉ khớp khi nhập đầy đủ và chính xác email đã từng đăng nhập G.Lab. Hệ thống không hiển thị danh sách email người dùng."
                  en="Only an exact full email for an existing G.Lab account will match. No user email directory is exposed."
                />
              </p>
            </div>
            <div>
              <label htmlFor="crew-notes" className={labelClass}>
                <LocalizedText vi="Ghi chú" en="Notes" />
              </label>
              <input
                id="crew-notes"
                name="notes"
                placeholder={locale === "vi" ? "Ghi chú phân công..." : "Assignment notes..."}
                className={`${fieldClass} border-0 bg-white`}
              />
            </div>
            <SubmitButton vi="Phân công ekip →" en="Assign crew →" />
            {crewFeedback ? (
              <p
                className={`rounded-r16 px-3 py-2 text-xs font-bold ${
                  crewState.ok ? "bg-mint text-ink" : "bg-coral text-error"
                }`}
              >
                {crewFeedback}
              </p>
            ) : null}
            <ConflictList conflicts={crewState.conflicts} />
          </form>
          ) : (
            <div className="rounded-r20 border border-dashed border-stroke bg-surface/80 p-4 text-xs font-semibold text-secondary">
              <LocalizedText vi="Lịch này do tài khoản khác tạo. Bạn có thể xem và phản hồi tham gia, nhưng không thể sửa phân công ekip." en="This shoot was created by another account. You can view it and respond to the assignment, but cannot edit crew assignments." />
            </div>
          )}

          {/* Assigned Crew List */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-[.15em] text-secondary">
              <LocalizedText vi="Danh sách đã phân công" en="Assigned Crew List" /> (
              {crewAssignments.length})
            </h4>
            {crewAssignments.length ? (
              crewAssignments.map(({ assignment, crewMember }) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-r22 border border-ink/5 bg-surface/90 p-3 shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      initials={crewMember.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{crewMember.name}</p>
                      <p className="truncate text-xs font-semibold text-secondary">
                        {assignment.role ||
                          crewMember.defaultRole ||
                          (locale === "vi" ? "Nhân sự" : "Crew")}
                      </p>
                      {crewMember.email ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="truncate text-[11px] font-semibold text-secondary/80">{crewMember.email}</p>
                          {crewMember.userId && assigneeByUserId.get(crewMember.userId) ? (
                            <Badge
                              variant={
                                assigneeByUserId.get(crewMember.userId)!.assignee.status === "accepted"
                                  ? "mint"
                                  : assigneeByUserId.get(crewMember.userId)!.assignee.status === "declined"
                                    ? "coral"
                                    : "yellow"
                              }
                              className="text-[9px] font-black"
                            >
                              {assigneeByUserId.get(crewMember.userId)!.assignee.status === "accepted"
                                ? (locale === "vi" ? "Đã xác nhận" : "Accepted")
                                : assigneeByUserId.get(crewMember.userId)!.assignee.status === "declined"
                                  ? (locale === "vi" ? "Đã từ chối" : "Declined")
                                  : (locale === "vi" ? "Chờ xác nhận" : "Pending")}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                      {assignment.notes ? (
                        <p className="truncate text-[11px] text-secondary/70 italic">
                          {assignment.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canManage ? <form
                    action={removeCrewAssignmentAction.bind(null, shootId, assignment.id)}
                  >
                    <button
                      type="submit"
                      className="min-h-11 rounded-pill border border-error/20 bg-white px-4 text-xs font-black text-error transition hover:bg-error hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-press"
                    >
                      <LocalizedText vi="Xóa" en="Remove" />
                    </button>
                  </form> : null}
                </div>
              ))
            ) : (
              <p className="rounded-r22 border border-dashed border-ink/10 bg-surface/70 p-4 text-center text-xs font-semibold text-secondary">
                <LocalizedText vi="Chưa phân công ekip." en="No crew assigned yet." />
              </p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
