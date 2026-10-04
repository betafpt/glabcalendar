"use client";

import React from "react";
import type { Shoot } from "@/server/db/schema";
import type { ShootProjectOption } from "@/server/shoot-detail-options";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Calendar1, Location, Warning2 } from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shoots/status-pill";
import { useLanguage } from "@/components/language-provider";
import { ShootEditForm } from "./shoot-edit-form";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { deleteShootAction } from "../actions";
import { cn } from "@/lib/utils";

function formatTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleTimeString();
  }
}

function formatDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

export function ShootScheduleSection({
  shoot,
  projects,
  timezone,
  canManage,
}: {
  shoot: Shoot;
  projects: ShootProjectOption[];
  timezone: string;
  canManage: boolean;
}) {
  const { locale } = useLanguage();
  const hasLocation = Boolean(shoot.locationName || shoot.locationAddress);
  const locationText =
    shoot.locationName || shoot.locationAddress || (locale === "vi" ? "Chưa có địa điểm" : "Location TBD");
  const isCancelled = shoot.status === "cancelled";
  const dateFormatted = formatDate(shoot.startsAt, timezone);
  const startTime = formatTime(shoot.startsAt, timezone);
  const endTime = formatTime(shoot.endsAt, timezone);
  const endDateFormatted = formatDate(shoot.endsAt, timezone);
  const crossesDay = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(shoot.startsAt) !== new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(shoot.endsAt);

  return (
    <AccordionItem
      value="schedule"
      className="overflow-hidden border border-stroke/90 bg-surface/95 transition-all duration-200"
    >
      <AccordionTrigger className="p-4 sm:p-5 hover:bg-black/[0.02]">
        <div className="flex flex-col gap-3.5">
          {/* Top Row: Icon + Section Title + Warning Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-r14 bg-pink/15 text-pink">
                <Calendar1 size={18} variant="Linear" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink">
                  <LocalizedText vi="LỊCH QUAY" en="SCHEDULE" />
                </p>
                <h3 className="font-display text-lg sm:text-xl font-black uppercase leading-tight tracking-tight text-ink">
                  <LocalizedText vi="Cập nhật lịch quay" en="Update shoot schedule" />
                  <span className="text-pink">*</span>
                </h3>
              </div>
            </div>

            {/* Badges Warnings if any */}
            <div className="flex flex-wrap items-center gap-2">
              {isCancelled ? (
                <Badge variant="coral" className="gap-1 font-black">
                  <Warning2 size={12} variant="Bold" />
                  <LocalizedText vi="Đã hủy" en="Cancelled" />
                </Badge>
              ) : null}
              {!hasLocation && !isCancelled ? (
                <Badge variant="yellow" className="gap-1 font-bold">
                  <Warning2 size={12} variant="Bold" />
                  <LocalizedText vi="Thiếu địa điểm" en="Missing location" />
                </Badge>
              ) : null}
            </div>
          </div>

          {/* 
            Summary Details Row:
            [STATUS PILL]   ngày/giờ chính   call time   location
            Ví dụ: [ ● ĐANG DIỄN RA ]  14:00–16:00 · Call 13:30 · Si, Hội An
          */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 pt-0.5 text-xs font-semibold text-secondary">
            {/* 1. STATUS PILL (Interactive Popover, min-h 40px, stops event propagation) */}
            <div className="shrink-0">
              <StatusPill status={shoot.status} shootId={shoot.id} editable={canManage} />
            </div>

            {/* 2. Ngày / Giờ chính */}
            <div className="flex items-center gap-1.5 truncate text-ink font-bold">
              <Calendar1 size={14} variant="Linear" className="shrink-0 text-ink/70" />
              <span className="truncate">
                {crossesDay ? `${dateFormatted} · ${startTime} → ${endDateFormatted} · ${endTime}` : `${dateFormatted} · ${startTime}–${endTime}`}
              </span>
            </div>

            {crossesDay ? (
              <Badge variant="yellow" className="font-black">
                <LocalizedText vi="Qua ngày" en="Overnight" />
              </Badge>
            ) : null}

            <span className="text-secondary/40 hidden sm:inline" aria-hidden="true">
              ·
            </span>

            {/* 3. Location */}
            <div className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-sm">
              <Location size={14} variant="Linear" className="shrink-0 text-ink/70" />
              <span
                className={cn(
                  "truncate",
                  hasLocation ? "text-ink font-medium" : "text-secondary/60 italic"
                )}
              >
                {locationText}
              </span>
            </div>
          </div>
        </div>
      </AccordionTrigger>

      {/* Expanded Content: Form and Actions */}
      <AccordionContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="border-t border-stroke/70 pt-4">
          {canManage ? (
            <ShootEditForm shoot={shoot} projects={projects} timezone={timezone} />
          ) : (
            <div className="rounded-r20 border border-dashed border-stroke bg-surface p-4 text-xs font-semibold text-secondary">
              <LocalizedText vi="Lịch này do tài khoản khác tạo. Mọi cập nhật từ người tạo sẽ tự hiển thị tại đây; bạn không thể sửa hoặc xóa lịch." en="This shoot is view-only for your account. Updates from the creator will appear here automatically." />
            </div>
          )}
          {canManage ? <div className="mt-5 border-t border-stroke pt-4">
            <DeleteEntityButton
              action={deleteShootAction.bind(null, shoot.id)}
              successHref="/shoots"
              viLabel="Xóa buổi quay"
              enLabel="Delete shoot"
            />
          </div> : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
