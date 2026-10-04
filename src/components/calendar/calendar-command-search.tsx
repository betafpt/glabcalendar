"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { StatusChip } from "@/components/ui/status-chip";
import { LocalizedText } from "@/components/ui/localized-text";
import { useLanguage } from "@/components/language-provider";
import { Calendar, Location, ArrowRight2 } from "@/components/ui/iconsax";
import { getStatusTone, getStatusLabel } from "@/lib/status-labels";

export type SearchableShoot = {
  id: string;
  title: string;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  locationName?: string | null;
  locationAddress?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  crewNames?: string[];
};

/**
 * Normalizes Vietnamese text by stripping accents and lowercasing for accurate search.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Multi-token AND search filter for Command search.
 * Ensures EVERY token in user search query must exist in the item's title, project, location, or crew.
 * Eliminates false positives (e.g., query "SI DINING" will NOT match event "Gụ").
 */
export function calendarCommandFilter(value: string, search: string): number {
  if (!search || !search.trim()) return 1;

  const normalizedQuery = normalizeSearchText(search);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return 1;

  const normalizedTarget = normalizeSearchText(value);

  // All query tokens must match within the searchable corpus
  const allMatch = queryTokens.every((token) => normalizedTarget.includes(token));
  if (!allMatch) return 0;

  // Exact phrase match receives highest score
  if (normalizedTarget.includes(normalizedQuery)) return 1;

  return 0.8;
}

export function CalendarCommandSearch({
  shoots,
  projectMap = {},
  timezone,
  open,
  onOpenChange,
}: {
  shoots: SearchableShoot[];
  projectMap?: Record<string, string>;
  timezone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [, startTransition] = useTransition();

  // Global Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (shootId: string) => {
    onOpenChange(false);
    startTransition(() => {
      router.push(`/shoots/${shootId}`);
    });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      filter={calendarCommandFilter}
    >
      <CommandInput
        placeholder={
          locale === "vi"
            ? "Tìm buổi quay, dự án, địa điểm, nhân sự... (⌘K)"
            : "Search shoots, projects, locations, crew... (⌘K)"
        }
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center space-y-1">
            <p className="font-extrabold text-ink">
              <LocalizedText
                vi="Không tìm thấy buổi quay nào."
                en="No matching shoots found."
              />
            </p>
            <p className="text-xs text-secondary font-medium">
              <LocalizedText
                vi="Thử tìm theo tên buổi quay, dự án, địa điểm hoặc nhân sự."
                en="Try searching by shoot title, project, location, or crew."
              />
            </p>
          </div>
        </CommandEmpty>

        <CommandGroup
          heading={
            locale === "vi" ? "Danh sách buổi quay" : "Scheduled Shoots"
          }
        >
          {shoots.map((shoot) => {
            const startDate =
              typeof shoot.startsAt === "string"
                ? new Date(shoot.startsAt)
                : shoot.startsAt;
            const endDate =
              typeof shoot.endsAt === "string"
                ? new Date(shoot.endsAt)
                : shoot.endsAt;
            const projectName =
              shoot.projectName ||
              (shoot.projectId ? projectMap[shoot.projectId] : null);

            const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
              timeZone: timezone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(date);
            const isOvernight = dateKey(startDate) !== dateKey(endDate);
            const formatDayTime = (date: Date) => new Intl.DateTimeFormat(
              locale === "vi" ? "vi-VN" : "en-US",
              {
                timeZone: timezone,
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }
            ).format(date);
            const dateStr = isOvernight
              ? `${formatDayTime(startDate)} → ${formatDayTime(endDate)}`
              : formatDayTime(startDate);

            // Construct searchable text strictly from shoot title, project, location, and crew
            // Excludes random UUIDs and status keywords to prevent accidental fuzzy matches
            const searchableText = [
              shoot.title,
              projectName ?? "",
              shoot.locationName ?? "",
              shoot.locationAddress ?? "",
              ...(shoot.crewNames ?? []),
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <CommandItem
                key={shoot.id}
                value={searchableText}
                onSelect={() => handleSelect(shoot.id)}
                className="group my-1 flex items-center justify-between gap-3 rounded-r16 border border-transparent p-2.5 transition-all hover:border-stroke hover:bg-white"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-ink group-hover:text-pink transition-colors">
                      {shoot.title}
                    </p>
                    <StatusChip tone={getStatusTone(shoot.status)} className="scale-90">{getStatusLabel(shoot.status, locale)}</StatusChip>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-secondary">
                    {projectName ? (
                      <span className="truncate text-ink/80">
                        {projectName}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} variant="Linear" className="text-secondary/70" />
                      {dateStr}
                    </span>
                    {isOvernight ? (
                      <span className="rounded-pill bg-yellow px-2 py-0.5 text-[10px] font-black text-ink">
                        <LocalizedText vi="Qua ngày" en="Overnight" />
                      </span>
                    ) : null}
                    {shoot.locationName ? (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Location size={12} variant="Linear" className="text-secondary/70" />
                        {shoot.locationName}
                      </span>
                    ) : null}
                    {shoot.crewNames && shoot.crewNames.length > 0 ? (
                      <span className="truncate text-secondary/90">
                        Ekip: {shoot.crewNames.slice(0, 2).join(", ")}{shoot.crewNames.length > 2 ? ` (+${shoot.crewNames.length - 2})` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className="grid size-7 place-items-center rounded-full bg-ink/5 text-secondary group-hover:bg-ink group-hover:text-white transition-colors">
                  <ArrowRight2 size={14} variant="Linear" />
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
