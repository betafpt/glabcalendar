"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocalizedText } from "@/components/ui/localized-text";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { CalendarSearchTrigger } from "@/components/calendar/calendar-search-trigger";
import type { CalendarView } from "@/lib/calendar-range";
import { cn } from "@/lib/utils";

type CalendarTopHeaderProps = {
  view: CalendarView;
  anchor: Date;
  cleanParams: Record<string, string | undefined>;
  totalHours?: number;
  readinessRate?: number;
  searchShoots: Array<{
    id: string;
    title: string;
    status: string;
    startsAt: string;
    endsAt: string;
    locationName?: string | null;
    locationAddress?: string | null;
    projectId?: string | null;
    projectName?: string;
    crewNames?: string[];
  }>;
  projectMap: Record<string, string>;
  timezone: string;
  hasActiveFilters?: boolean;
};

export function CalendarTopHeader({
  view,
  cleanParams,
  searchShoots,
  projectMap,
  timezone,
}: CalendarTopHeaderProps) {
  const router = useRouter();

  const handleSwitchView = (newView: CalendarView) => {
    const query = new URLSearchParams();
    query.set("view", newView);
    if (cleanParams.date) query.set("date", cleanParams.date);
    for (const [k, v] of Object.entries(cleanParams)) {
      if (v && k !== "view" && k !== "date") query.set(k, v);
    }
    router.push(`/calendar?${query.toString()}`, { scroll: false });
  };

  const viewItems: Array<{ id: CalendarView; label: { vi: string; en: string } }> = [
    { id: "day", label: { vi: "Ngày", en: "Day" } },
    { id: "week", label: { vi: "Tuần", en: "Week" } },
    { id: "month", label: { vi: "Tháng", en: "Month" } },
  ];

  return (
    <header className="flex h-14 items-center justify-between gap-3">
      {/* Góc trái main area: G.Lab Calendar * nhỏ gọn thanh lịch */}
      <div className="flex items-center gap-2">
        <Link
          href="/calendar"
          className="group inline-flex items-baseline gap-1 text-lg sm:text-xl font-black tracking-[-0.03em] text-ink font-display transition-transform hover:scale-[1.01]"
        >
          <span>G.Lab Calendar</span>
          <span className="text-pink text-base leading-none">*</span>
        </Link>
      </div>

      {/* Trung tâm: Segmented control Ngày / Tuần / Tháng */}
      <div className="flex items-center rounded-full border border-black/[0.06] bg-white/80 p-1 shadow-xs backdrop-blur-md">
        {viewItems.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSwitchView(item.id)}
              className={cn(
                "min-h-8 rounded-full px-3.5 text-xs font-black transition-all duration-fast active:scale-press",
                active
                  ? "bg-ink text-white shadow-soft"
                  : "text-secondary hover:text-ink hover:bg-surface/80"
              )}
            >
              <LocalizedText vi={item.label.vi} en={item.label.en} />
            </button>
          );
        })}
      </div>

      {/* Góc phải: search, Google Sync dạng icon/status nhỏ, notification, avatar/settings */}
      <div className="flex items-center justify-end gap-2">
        {/* Quick Search Dialog */}
        <CalendarSearchTrigger
          shoots={searchShoots}
          projectMap={projectMap}
          timezone={timezone}
        />

        {/* Google Sync Status - Compact icon/status */}
        <Link
          href="/integrations/google-calendar"
          title="Google Calendar Sync: Hoạt động"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink shadow-xs hover:border-pink/40 transition-colors"
        >
          <span className="size-2 rounded-full bg-[#1da875]" />
          <span className="text-[10px] font-bold text-secondary">Sync</span>
        </Link>

        {/* Profile & Workspace Menu */}
        <WorkspaceMenu />
      </div>
    </header>
  );
}
