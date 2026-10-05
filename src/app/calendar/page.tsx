import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { StatusChip } from "@/components/ui/status-chip";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { CalendarSearchTrigger } from "@/components/calendar/calendar-search-trigger";
import { CalendarMonthDnd } from "@/components/calendar/calendar-month-dnd";
import { CalendarWeekDnd } from "@/components/calendar/calendar-week-dnd";
import { CalendarContextPanel } from "@/components/calendar/calendar-context-panel";
import { CalendarTopHeader } from "@/components/calendar/calendar-top-header";
import { CalendarTimelineWeek } from "@/components/calendar/calendar-timeline-week";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { CalendarViewTransition } from "@/components/ui/motion-container";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { DEFAULT_APP_TIMEZONE, getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import {
  calendarRange,
  shiftAnchor,
  zonedDateParts,
  type CalendarView,
} from "@/lib/calendar-range";
import {
  SearchNormal1,
  FilterSearch,
  Add,
  ArrowRight2,
  TickCircle,
  Location,
  Clock,
  Calendar,
  More,
} from "@/components/ui/iconsax";
import type { Shoot } from "@/server/db/schema";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";

export const dynamic = "force-dynamic";

type SearchParams = {
  view?: string;
  date?: string;
  projectId?: string;
  crewMemberId?: string;
  equipmentItemId?: string;
  includeTestData?: string;
};

type PageData = {
  shoots: Shoot[];
  projects: Array<{ id: string; name: string }>;
  crew: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  timezone: string;
  shootCrewMap?: Record<string, string[]>;
  attentionData?: {
    totalConflicts: number;
    conflictsList: Array<{ shootTitle: string; note: string }>;
    pendingChecklistCount: number;
    checklistItems: Array<{ id: string; title: string; shootTitle: string; completed: boolean }>;
  };
  error?: string;
};

const eventTones = [
  "bg-lilac text-ink border border-ink/10 shadow-sm",
  "bg-mint text-ink border border-ink/10 shadow-sm",
  "bg-yellow text-ink border border-ink/10 shadow-sm",
  "bg-sky text-ink border border-ink/10 shadow-sm",
  "bg-coral text-ink border border-ink/10 shadow-sm",
];

const toneAccentDots = [
  "bg-[#7a58ec]",
  "bg-[#1da875]",
  "bg-[#e59b00]",
  "bg-[#2d7bf4]",
  "bg-[#ff4f9a]",
];

const statusToneMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
  confirmed: "success",
  completed: "neutral",
  cancelled: "error",
  planned: "warning",
  in_progress: "warning",
  active: "success",
};

const statusLabels: Record<string, { vi: string; en: string }> = {
  confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
  planned: { vi: "Kế hoạch", en: "Planned" },
  in_progress: { vi: "Đang diễn ra", en: "In progress" },
  completed: { vi: "Hoàn thành", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
  active: { vi: "Đang thực hiện", en: "Active" },
};

const weekHeaders = [
  { en: "MON", vi: "T2", isWeekend: false },
  { en: "TUE", vi: "T3", isWeekend: false },
  { en: "WED", vi: "T4", isWeekend: false },
  { en: "THU", vi: "T5", isWeekend: false },
  { en: "FRI", vi: "T6", isWeekend: false },
  { en: "SAT", vi: "T7", isWeekend: true },
  { en: "SUN", vi: "CN", isWeekend: true },
];

function zonedTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: value("hour"), minute: value("minute") };
}

function shootDuration(startsAt: Date, endsAt: Date) {
  const durationMs = Math.max(0, endsAt.getTime() - startsAt.getTime());
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function isPastOrCompletedShoot(shoot: Shoot, now: Date) {
  return shoot.status === "completed" || shoot.endsAt.getTime() < now.getTime();
}

function getWeekDays(anchor: Date, timeZone: string): Date[] {
  const { year, month, day } = zonedDateParts(anchor, timeZone);
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const mondayOffset = (localNoon.getUTCDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(year, month - 1, day - mondayOffset + i, 12, 0, 0));
    days.push(d);
  }
  return days;
}

function safeView(value?: string): CalendarView {
  return value === "month" || value === "day" ? value : "week";
}

function safeDate(value?: string) {
  const date = value ? new Date(`${value}T12:00:00Z`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toDate(val: unknown): Date {
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function dateKey(date: Date | string, timeZone: string) {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatTime(date: Date | string, timeZone: string) {
  const d = toDate(date);
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function monthLabels(anchor: Date | string, timeZone: string) {
  const d = toDate(anchor);
  const en = new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(d).toUpperCase();

  const vi = new Intl.DateTimeFormat("vi", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(d).toUpperCase();

  return { vi, en };
}

function periodLabels(
  view: CalendarView,
  anchor: Date,
  start: Date,
  end: Date,
  timeZone: string,
) {
  if (view === "month") {
    const en = new Intl.DateTimeFormat("en", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(anchor);
    const viRaw = new Intl.DateTimeFormat("vi", {
      timeZone,
      month: "long",
      year: "numeric",
    }).format(anchor);
    const vi = viRaw.charAt(0).toUpperCase() + viRaw.slice(1);
    return { vi, en };
  }

  if (view === "day") {
    const en = new Intl.DateTimeFormat("en", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(anchor);
    const viRaw = new Intl.DateTimeFormat("vi", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(anchor);
    const vi = viRaw.charAt(0).toUpperCase() + viRaw.slice(1);
    return { vi, en };
  }

  const lastDay = new Date(end.getTime() - 1);
  const en = `${new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(start)} — ${new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(lastDay)}`;

  const vi = `${new Intl.DateTimeFormat("vi", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(start)} — ${new Intl.DateTimeFormat("vi", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(lastDay)}`;

  return { vi, en };
}

function getMonthGridDays(anchor: Date, timeZone: string): Date[] {
  const { year, month } = zonedDateParts(anchor, timeZone);
  // Noon UTC on the 1st of the month
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  // Monday is 0, Sunday is 6
  const startDayOfWeek = (firstOfMonth.getUTCDay() + 6) % 7;
  // Days in current month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Ensure full 7-day rows and standard 35 or 42 cells
  const totalDays = Math.max(35, Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7);

  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dayOffset = i - startDayOfWeek;
    const d = new Date(Date.UTC(year, month - 1, 1 + dayOffset, 12, 0, 0));
    days.push(d);
  }
  return days;
}

function monthGridRange(anchor: Date, timeZone: string) {
  const days = getMonthGridDays(anchor, timeZone);
  return {
    start: calendarRange("day", days[0], timeZone).start,
    end: calendarRange("day", days[days.length - 1], timeZone).end,
  };
}

async function loadData(
  anchor: Date,
  view: CalendarView,
  filters: { projectId?: string; crewMemberId?: string; equipmentItemId?: string; includeTestData?: boolean },
): Promise<PageData> {
  let timezone = DEFAULT_APP_TIMEZONE;

  try {
    timezone = getServerConfig().appTimezone;
    const [
      { db },
      { createCalendarRepository },
      { createCalendarService },
      { getCalendarFilterOptions },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/calendar"),
      import("@/server/services/calendar"),
      import("@/server/calendar-filter-options"),
    ]);

    const { user, organization } = await requireWorkspaceContext();
    const queryRange =
      view === "month"
        ? monthGridRange(anchor, organization.timezone)
        : calendarRange(view, anchor, organization.timezone);
    const calendarRepo = createCalendarRepository(db);
    const { getCachedCalendarShoots, getCachedCalendarFilterOptions } = await import("@/server/cached-loaders");
    const filtersKey = JSON.stringify(filters);
    const [workspaceShoots, assignedShoots, filterOptions] = await Promise.all([
      getCachedCalendarShoots(
        organization.id,
        queryRange.start.toISOString(),
        queryRange.end.toISOString(),
        filtersKey
      ),
      calendarRepo.listAssignedRange(user.id, queryRange.start, queryRange.end, filters),
      getCachedCalendarFilterOptions(organization.id),
    ]);
    const shoots = Array.from(
      new Map([...workspaceShoots, ...assignedShoots].map((shoot) => {
        const s = {
          ...shoot,
          startsAt: toDate(shoot.startsAt),
          endsAt: toDate(shoot.endsAt),
          createdAt: toDate(shoot.createdAt),
          updatedAt: toDate(shoot.updatedAt),
        };
        return [s.id, s];
      })).values()
    ).sort((a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime());

    const shootCrewMap: Record<string, string[]> = {};
    if (shoots.length > 0) {
      const { inArray, eq, and } = await import("drizzle-orm");
      const { shootCrewAssignments, crewMembers } = await import("@/server/db/schema");
      const shootIds = shoots.map((s) => s.id);
      const assignments = await db
        .select({
          shootId: shootCrewAssignments.shootId,
          crewName: crewMembers.name,
        })
        .from(shootCrewAssignments)
        .innerJoin(crewMembers, eq(crewMembers.id, shootCrewAssignments.crewMemberId))
        .where(
          and(
            inArray(shootCrewAssignments.shootId, shootIds)
          )
        );
      for (const a of assignments) {
        if (!shootCrewMap[a.shootId]) {
          shootCrewMap[a.shootId] = [];
        }
        shootCrewMap[a.shootId].push(a.crewName);
      }
    }

    const attentionData = {
      totalConflicts: 0,
      conflictsList: [] as Array<{ shootTitle: string; note: string }>,
      pendingChecklistCount: 0,
      checklistItems: [] as Array<{ id: string; title: string; shootTitle: string; completed: boolean }>,
    };

    if (shoots.length > 0) {
      try {
        const { createChecklistRepository } = await import("@/server/db/checklists");
        const checklistRepo = createChecklistRepository(db);
        const shootIds = shoots.map((s) => s.id);
        const items = await checklistRepo.listForShoots(organization.id, shootIds);
        const pending = items.filter((i) => !i.isCompleted);
        attentionData.pendingChecklistCount = pending.length;
        attentionData.checklistItems = pending.map((i) => ({
          id: i.id,
          title: i.title,
          shootTitle: shoots.find((s) => s.id === i.shootId)?.title || "Lịch quay",
          completed: i.isCompleted,
        }));
      } catch {
        // Fallback gracefully
      }
    }

    const formattedShoots = shoots.map((s) => {
      let displayTitle = s.title;
      if (s.isTestData) {
        displayTitle = `[TEST] ${s.title}`;
      } else if (s.syncPolicy === "excluded") {
        displayTitle = `[LOẠI TRỪ] ${s.title}`;
      }
      return { ...s, title: displayTitle };
    });

    return {
      shoots: formattedShoots,
      ...filterOptions,
      timezone: organization.timezone,
      shootCrewMap,
      attentionData,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      shoots: [],
      projects: [],
      crew: [],
      equipment: [],
      timezone,
      error: errorMessage(error, "Unable to load calendar."),
    };
  }
}

function queryHref(
  view: CalendarView,
  anchor: Date,
  params: SearchParams,
  timeZone: string,
) {
  const search = new URLSearchParams();
  search.set("view", view);
  search.set("date", dateKey(anchor, timeZone));
  for (const key of ["projectId", "crewMemberId", "equipmentItemId", "includeTestData"] as const) {
    const val = params[key]?.trim();
    if (val) search.set(key, val);
  }
  return `/calendar?${search}`;
}

function Icon({
  name,
  className = "",
  size = 17,
}: {
  name:
    | "search"
    | "filter"
    | "plus"
    | "arrow"
    | "dots"
    | "check"
    | "location"
    | "clock"
    | "calendar";
  className?: string;
  size?: number;
}) {
  if (name === "search") {
    return <SearchNormal1 size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "filter") {
    return <FilterSearch size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "plus") {
    return <Add size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "arrow") {
    return <ArrowRight2 size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "check") {
    return <TickCircle size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "location") {
    return <Location size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "clock") {
    return <Clock size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  if (name === "calendar") {
    return <Calendar size={size} variant="Linear" className={className} aria-hidden="true" />;
  }
  return <More size={size} variant="Linear" className={className} aria-hidden="true" />;
}


export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const view = safeView(searchParams.view);
  const anchor = safeDate(searchParams.date);
  const projectId = searchParams.projectId?.trim() || undefined;
  const crewMemberId = searchParams.crewMemberId?.trim() || undefined;
  const equipmentItemId = searchParams.equipmentItemId?.trim() || undefined;
  const includeTestData = searchParams.includeTestData === "true" || searchParams.includeTestData === "1";

  const cleanParams: SearchParams = {
    view,
    date: searchParams.date,
    projectId,
    crewMemberId,
    equipmentItemId,
    includeTestData: includeTestData ? "true" : undefined,
  };

  const data = await loadData(anchor, view, {
    projectId,
    crewMemberId,
    equipmentItemId,
    includeTestData,
  });

  const previous = shiftAnchor(anchor, view, -1);
  const next = shiftAnchor(anchor, view, 1);
  const range = calendarRange(view, anchor, data.timezone);
  const now = new Date();
  const todayKey = dateKey(now, data.timezone);
  const anchorKey = dateKey(anchor, data.timezone);
  const isViewingCurrentPeriod =
    view === "day"
      ? anchorKey === todayKey
      : view === "month"
      ? anchorKey.slice(0, 7) === todayKey.slice(0, 7)
      : now.getTime() >= range.start.getTime() && now.getTime() < range.end.getTime();

  const grouped = new Map<string, Shoot[]>();
  for (const shoot of data.shoots) {
    const key = dateKey(shoot.startsAt, data.timezone);
    grouped.set(key, [...(grouped.get(key) ?? []), shoot]);
  }

  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  // Month grid days (with leading and trailing days from adjacent months)
  const monthGridDays = getMonthGridDays(anchor, data.timezone);
  const { month: anchorMonth } = zonedDateParts(anchor, data.timezone);

  // Week days for week view
  const weekDaysList = view === "week" ? getWeekDays(anchor, data.timezone) : [];

  // Upcoming shoots this month
  const futureShoots = [...data.shoots]
    .filter((shoot) => toDate(shoot.startsAt) >= now)
    .sort((a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime());
  const upcoming = (
    futureShoots.length > 0
      ? futureShoots
      : [...data.shoots].sort(
          (a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime(),
        )
  ).slice(0, 3);

  const viewItems: Array<{ view: CalendarView; vi: string; en: string }> = [
    { view: "week", vi: "Tuần", en: "Week" },
    { view: "month", vi: "Tháng", en: "Month" },
    { view: "day", vi: "Dòng thời gian", en: "Timeline" },
  ];

  const monthLabelsObj = monthLabels(anchor, data.timezone);
  const periodObj = periodLabels(view, anchor, range.start, range.end, data.timezone);

  const hasActiveFilters = Boolean(
    projectId || crewMemberId || equipmentItemId || includeTestData,
  );

  const selectedProject = projectId
    ? data.projects.find((p) => p.id === projectId)
    : undefined;
  const selectedCrew = crewMemberId
    ? data.crew.find((c) => c.id === crewMemberId)
    : undefined;
  const selectedGear = equipmentItemId
    ? data.equipment.find((e) => e.id === equipmentItemId)
    : undefined;

  // Calculate production metrics for top header
  const todayShoots = data.shoots.filter((s) => {
    const sStartKey = dateKey(s.startsAt, data.timezone);
    const sEndKey = dateKey(s.endsAt, data.timezone);
    return todayKey >= sStartKey && todayKey <= sEndKey;
  });

  let totalHoursCount = 0;
  for (const s of (todayShoots.length > 0 ? todayShoots : data.shoots)) {
    totalHoursCount += Math.max(0, toDate(s.endsAt).getTime() - toDate(s.startsAt).getTime()) / 3600000;
  }
  const totalHours = Math.round(totalHoursCount * 10) / 10;

  const attention = data.attentionData || {
    totalConflicts: 0,
    conflictsList: [],
    pendingChecklistCount: 0,
    checklistItems: [],
  };

  const readinessRate =
    attention.pendingChecklistCount === 0 && attention.totalConflicts === 0
      ? 100
      : Math.max(45, Math.round(100 - attention.pendingChecklistCount * 15 - attention.totalConflicts * 20));

  const contextPanelShoots = data.shoots.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: toDate(s.startsAt).toISOString(),
    endsAt: toDate(s.endsAt).toISOString(),
    status: s.status,
    locationName: s.locationName,
    locationAddress: s.locationAddress,
    projectName: s.projectId ? projectMap.get(s.projectId) : undefined,
    crewCount: data.shootCrewMap?.[s.id]?.length || 0,
  }));

  // Week days for week timeline view (with multi-day overlap support)
  const weekTimelineDays = (view === "week" ? getWeekDays(anchor, data.timezone) : []).map((day, dayIndex) => {
    const key = dateKey(day, data.timezone);
    const isToday = key === todayKey;
    const isAnchor = key === anchorKey;
    const header = weekHeaders[dayIndex];
    const dayParts = zonedDateParts(day, data.timezone);

    // Multi-day overlap support: shoots overlapping this day
    const dayShoots = data.shoots.filter((s) => {
      const sStartKey = dateKey(s.startsAt, data.timezone);
      const sEndKey = dateKey(s.endsAt, data.timezone);
      return key >= sStartKey && key <= sEndKey;
    });

    return {
      dateKey: key,
      dayNumber: dayParts.day,
      dayName: header.vi,
      isToday,
      isAnchor,
      dayIso: day.toISOString(),
      shoots: dayShoots.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: toDate(s.startsAt).toISOString(),
        endsAt: toDate(s.endsAt).toISOString(),
        status: s.status,
        isPastOrCompleted: isPastOrCompletedShoot(s, now),
        projectId: s.projectId,
        locationName: s.locationName,
        crewNames: data.shootCrewMap?.[s.id] || [],
      })),
    };
  });

  return (
    <div className="w-full pb-32 pt-1 sm:pb-24 lg:pb-8">
      {/* 1. TOP HEADER (Góc trái: G.Lab Calendar *, Giữa: [Ngày | Tuần | Tháng] với Tuần active, Phải: controls) */}
      <CalendarTopHeader
        view={view}
        anchor={anchor}
        cleanParams={cleanParams}
        totalHours={totalHours}
        readinessRate={readinessRate}
        searchShoots={data.shoots.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          startsAt: toDate(s.startsAt).toISOString(),
          endsAt: toDate(s.endsAt).toISOString(),
          locationName: s.locationName,
          locationAddress: s.locationAddress,
          projectId: s.projectId,
          projectName: s.projectId ? projectMap.get(s.projectId) : undefined,
          crewNames: data.shootCrewMap?.[s.id] || [],
        }))}
        projectMap={Object.fromEntries(projectMap.entries())}
        timezone={data.timezone}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Mobile Drawer Trigger for Left Context Panel (Reference Column 2 on Mobile) */}
      <div className="lg:hidden flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-black/[0.05] shadow-xs my-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-pink" />
          <span className="text-xs font-black text-ink uppercase tracking-wider">
            Lịch nhỏ & Tóm tắt
          </span>
        </div>
        <Sheet>
          <SheetTrigger className="rounded-full bg-ink text-white px-3.5 py-1.5 text-[11px] font-black shadow-soft active:scale-press">
            Mở xem
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-black/[0.06] p-4">
            <SheetTitle className="sr-only">Lịch nhỏ và tóm tắt</SheetTitle>
            <CalendarContextPanel
              currentAnchor={anchor}
              selectedDate={anchor}
              timezone={data.timezone}
              shoots={contextPanelShoots}
              attentionData={attention}
              cleanParams={cleanParams}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* 2. MAIN 2-COLUMN WORKSPACE: CONTEXT PANEL + FLUID GAP + MAIN CALENDAR */}
      <div className="mt-4 flex flex-col gap-6 lg:calendar-workspace-grid lg:items-start">
        {/* VÙNG 2: LEFT CONTEXT PANEL (Fluid clamp(340px, 20vw, 380px) column, sticky on desktop) */}
        <div className="hidden lg:block w-full shrink-0 lg:sticky lg:top-4">
          <CalendarContextPanel
            currentAnchor={anchor}
            selectedDate={anchor}
            timezone={data.timezone}
            shoots={contextPanelShoots}
            attentionData={attention}
            cleanParams={cleanParams}
          />
        </div>

        {/* VÙNG 3: MAIN CALENDAR (Focal point chính bắt đầu cùng hàng với context panel) */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Database Error Banner */}
          {data.error ? <DatabaseErrorBanner error={data.error} /> : null}

          {/* Active Filter Chips */}
          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-[16px] bg-white/70 p-2.5 border border-black/[0.05] shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
                <LocalizedText vi="Đang lọc:" en="Filtered by:" />
              </span>
              {projectId ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                  <span>{selectedProject?.name || "Dự án đã chọn"}</span>
                  <Link
                    href={queryHref(view, anchor, { ...cleanParams, projectId: undefined }, data.timezone)}
                    className="hover:opacity-70 font-bold"
                  >
                    ×
                  </Link>
                </span>
              ) : null}
              {crewMemberId ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                  <span>{selectedCrew?.name || "Nhân sự đã chọn"}</span>
                  <Link
                    href={queryHref(view, anchor, { ...cleanParams, crewMemberId: undefined }, data.timezone)}
                    className="hover:opacity-70 font-bold"
                  >
                    ×
                  </Link>
                </span>
              ) : null}
              {equipmentItemId ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                  <span>{selectedGear?.name || "Thiết bị đã chọn"}</span>
                  <Link
                    href={queryHref(view, anchor, { ...cleanParams, equipmentItemId: undefined }, data.timezone)}
                    className="hover:opacity-70 font-bold"
                  >
                    ×
                  </Link>
                </span>
              ) : null}
              <Link
                href={queryHref(view, anchor, {}, data.timezone)}
                className="text-[10px] font-black text-secondary hover:text-ink underline ml-1"
              >
                <LocalizedText vi="Xóa tất cả" en="Clear all" />
              </Link>
            </div>
          ) : null}

          {/* PRIMARY CALENDAR VIEW: WEEK TIMELINE (REFERENCE-IDENTICAL) / MONTH DND / DAY TIMELINE */}
          <CalendarViewTransition viewKey={`${view}-${cleanParams.date ?? ""}`}>
            {view === "week" ? (
              <CalendarTimelineWeek
                days={weekTimelineDays}
                periodLabel={periodObj.vi}
                timezone={data.timezone}
                cleanParams={cleanParams}
                projectMap={Object.fromEntries(projectMap.entries())}
                onNavigatePrev={queryHref(view, previous, cleanParams, data.timezone)}
                onNavigateNext={queryHref(view, next, cleanParams, data.timezone)}
                onNavigateToday={queryHref(view, new Date(), cleanParams, data.timezone)}
                isViewingCurrentPeriod={isViewingCurrentPeriod}
              />
            ) : view === "month" ? (
              <CalendarMonthDnd
                days={monthGridDays.map((day) => {
                  const key = dateKey(day, data.timezone);
                  const shoots = data.shoots.filter((s) => {
                    const sStartKey = dateKey(s.startsAt, data.timezone);
                    const sEndKey = dateKey(s.endsAt, data.timezone);
                    return key >= sStartKey && key <= sEndKey;
                  });
                  const isToday = key === todayKey;
                  const dayParts = zonedDateParts(day, data.timezone);
                  const outsideMonth = dayParts.month !== anchorMonth;
                  return {
                    dateKey: key,
                    dayNumber: dayParts.day,
                    isToday,
                    outsideMonth,
                    dayIso: day.toISOString(),
                    shoots: shoots.map((s) => ({
                      id: s.id,
                      title: s.title,
                      startsAt: s.startsAt.toISOString(),
                      endsAt: s.endsAt.toISOString(),
                      status: s.status,
                      isPastOrCompleted: isPastOrCompletedShoot(s, now),
                      projectId: s.projectId,
                      locationName: s.locationName,
                    })),
                  };
                })}
                timezone={data.timezone}
                todayKey={todayKey}
                weekHeaders={weekHeaders}
                cleanParams={cleanParams}
                periodLabel={monthLabelsObj.vi}
                onNavigatePrev={queryHref(view, previous, cleanParams, data.timezone)}
                onNavigateNext={queryHref(view, next, cleanParams, data.timezone)}
                onNavigateToday={queryHref(view, new Date(), cleanParams, data.timezone)}
                isViewingCurrentPeriod={isViewingCurrentPeriod}
              />
            ) : (
              <CalendarDayTimelineView
                anchor={anchor}
                data={data}
                searchParams={cleanParams}
                projectMap={projectMap}
                todayKey={todayKey}
                anchorKey={anchorKey}
                now={now}
              />
            )}
          </CalendarViewTransition>
        </div>
      </div>
    </div>
  );
}


function CalendarWeekView({
  anchor,
  data,
  searchParams,
  projectMap,
  todayKey,
  anchorKey,
  weekDaysList,
  grouped,
}: {
  anchor: Date;
  data: PageData;
  searchParams: SearchParams;
  projectMap: Map<string, string>;
  todayKey: string;
  anchorKey: string;
  weekDaysList: Date[];
  grouped: Map<string, Shoot[]>;
}) {
  const now = new Date();
  const confirmedCount = data.shoots.filter((s) => s.status === "confirmed").length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-4 sm:p-5 shadow-sm">
      {/* Week Overview Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-black/[0.05] pb-3 sm:pb-3.5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-pink" />
            <LocalizedText vi="LỊCH TRÌNH TUẦN" en="WEEKLY SCHEDULE" />
          </p>
          <h2 className="mt-0.5 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
            <LocalizedText vi="Tổng quan 7 ngày" en="7-Day Overview" />
            <span className="text-pink ml-0.5">*</span>
          </h2>
        </div>

        {/* Quick Metrics Badges & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-stroke/80 bg-white/80 px-3 py-1.5 text-xs font-black text-ink shadow-soft">
            <span className="size-2 rounded-full bg-pink" />
            <span>
              {data.shoots.length} <LocalizedText vi="buổi quay tuần này" en="shoots this week" />
            </span>
          </span>

          {confirmedCount > 0 ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-pill border border-mint bg-mint/50 px-2.5 py-1 text-[11px] font-black text-ink shadow-soft">
              <span className="size-1.5 rounded-full bg-[#1da875]" />
              <span>
                {confirmedCount} <LocalizedText vi="đã xác nhận" en="confirmed" />
              </span>
            </span>
          ) : null}

          <Link
            href="/shoots"
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-pill bg-ink px-3.5 text-xs font-black text-white shadow-soft transition hover:bg-ink/90 active:scale-press"
          >
            <Icon name="plus" />
            <span>
              <LocalizedText vi="Tạo buổi quay" en="New shoot" />
            </span>
          </Link>
        </div>
      </div>

      {/* 7-Day Interactive Day Selector Strip */}
      <div className="mt-3 sm:mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {weekDaysList.map((day, dayIndex) => {
          const key = dateKey(day, data.timezone);
          const isToday = key === todayKey;
          const isAnchor = key === anchorKey;
          const dayShoots = grouped.get(key) ?? [];
          const header = weekHeaders[dayIndex];

          return (
            <Link
              key={key}
              href={queryHref("day", day, searchParams, data.timezone)}
              className={`group relative rounded-r16 sm:rounded-r22 p-1.5 sm:p-2.5 text-center transition-all duration-fast hover:-translate-y-0.5 hover:shadow-soft active:scale-press border ${
                isToday
                  ? "bg-pink text-white border-pink shadow-soft ring-2 ring-pink/20"
                  : isAnchor
                  ? "bg-ink text-white border-ink shadow-soft"
                  : "bg-surface border-stroke/70 hover:bg-white text-ink"
              }`}
              title={`${header.en} - ${key}`}
            >
              <p
                className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[.08em] ${
                  isToday || isAnchor
                    ? "text-white/80"
                    : header.isWeekend
                    ? "text-pink"
                    : "text-secondary"
                }`}
              >
                <LocalizedText vi={header.vi} en={header.en} />
              </p>
              <p className="mt-0.5 font-display text-lg sm:text-2xl lg:text-3xl font-black leading-none">
                {new Intl.DateTimeFormat("en", {
                  timeZone: data.timezone,
                  day: "numeric",
                }).format(day)}
              </p>

              {/* Shoot count indicator / dots */}
              <div className="mx-auto mt-1 flex h-2 items-center justify-center gap-0.5">
                {dayShoots.length > 0 ? (
                  dayShoots.slice(0, 3).map((s, idx) => (
                    <span
                      key={s.id}
                      className={`size-1.5 rounded-full ${
                        isToday || isAnchor
                          ? "bg-white"
                          : toneAccentDots[(dayIndex + idx) % toneAccentDots.length]
                      }`}
                    />
                  ))
                ) : (
                  <span className="size-1.5 opacity-0" />
                )}
                {dayShoots.length > 3 ? (
                  <span
                    className={`text-[7px] font-black leading-none ${
                      isToday || isAnchor ? "text-white" : "text-secondary"
                    }`}
                  >
                    +
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {/* DESKTOP & TABLET: FULL 7-DAY MULTI-COLUMN BOARD WITH DND */}
      <CalendarWeekDnd
        columns={weekDaysList.map((day, dayIndex) => {
          const key = dateKey(day, data.timezone);
          const isToday = key === todayKey;
          const isAnchor = key === anchorKey;
          const dayShoots = (grouped.get(key) ?? []).sort(
            (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
          );
          const header = weekHeaders[dayIndex];
          const dayParts = zonedDateParts(day, data.timezone);

          return {
            dateKey: key,
            dayNumber: dayParts.day,
            isToday,
            isAnchor,
            header,
            dayIso: day.toISOString(),
            shoots: dayShoots.map((s) => ({
              id: s.id,
              title: s.title,
              startsAt: s.startsAt.toISOString(),
              endsAt: s.endsAt.toISOString(),
              status: s.status,
              isPastOrCompleted: isPastOrCompletedShoot(s, now),
              projectId: s.projectId,
              locationName: s.locationName,
            })),
          };
        })}
        timezone={data.timezone}
        cleanParams={searchParams}
        projectMap={Object.fromEntries(projectMap.entries())}
        statusLabels={statusLabels}
      />

      {/* MOBILE: RESPONSIVE DAY-BY-DAY AGENDA FEED */}
      <div className="mt-4 space-y-3 block md:hidden">
        {weekDaysList.map((day, dayIndex) => {
          const key = dateKey(day, data.timezone);
          const isToday = key === todayKey;
          const isAnchor = key === anchorKey;
          const dayShoots = (grouped.get(key) ?? []).sort(
            (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
          );
          const header = weekHeaders[dayIndex];

          return (
            <div
              key={key}
              className={`rounded-r18 border p-2.5 sm:p-3 transition-colors ${
                isToday
                  ? "border-pink/40 bg-pink/[0.04]"
                  : isAnchor
                  ? "border-ink/20 bg-surface/90"
                  : "border-stroke/70 bg-surface/50"
              }`}
            >
              {/* Day Header Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-stroke/60">
                <div className="flex items-center gap-2">
                  <Link
                    href={queryHref("day", day, searchParams, data.timezone)}
                    className={`grid size-7 place-items-center rounded-full text-xs font-black transition-all ${
                      isToday
                        ? "bg-pink text-white shadow-soft"
                        : isAnchor
                        ? "bg-ink text-white"
                        : "bg-surface border border-stroke text-ink hover:bg-white"
                    }`}
                  >
                    {new Intl.DateTimeFormat("en", {
                      timeZone: data.timezone,
                      day: "numeric",
                    }).format(day)}
                  </Link>

                  <div>
                    <span
                      className={`text-xs font-black uppercase tracking-tight ${
                        header.isWeekend ? "text-pink" : "text-ink"
                      }`}
                    >
                      <LocalizedText vi={header.vi} en={header.en} />
                      {", "}
                      {new Intl.DateTimeFormat("en", {
                        timeZone: data.timezone,
                        month: "short",
                        day: "numeric",
                      }).format(day)}
                    </span>
                    {isToday ? (
                      <span className="ml-1.5 rounded-pill bg-pink/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-pink">
                        <LocalizedText vi="Hôm nay" en="Today" />
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-secondary tabular-nums">
                    {dayShoots.length} <LocalizedText vi="buổi" en="shoots" />
                  </span>
                  <Link
                    href={queryHref("day", day, searchParams, data.timezone)}
                    className="text-[10px] font-bold text-pink hover:underline"
                  >
                    <LocalizedText vi="Xem" en="View" /> →
                  </Link>
                </div>
              </div>

              {/* Day Shoots List */}
              <div className="mt-2 space-y-2">
                {dayShoots.length > 0 ? (
                  dayShoots.map((shoot, shootIndex) => {
                    const tone =
                      eventTones[(dayIndex + shootIndex) % eventTones.length];

                    return (
                      <Link
                        key={shoot.id}
                        href={`/shoots/${shoot.id}`}
                        className={`grid grid-cols-[56px_minmax(0,1fr)_32px] items-center gap-2 rounded-r14 p-2.5 transition-all duration-fast hover:-translate-y-0.5 active:scale-press ${tone} ${isPastOrCompletedShoot(shoot, now) ? "opacity-45 grayscale-[35%]" : ""}`}
                      >
                        <div className="border-r border-ink/10 pr-1.5 text-center">
                          <p className="text-[11px] font-black text-ink">
                            {formatTime(shoot.startsAt, data.timezone)}
                          </p>
                          <p className="text-[9px] font-bold text-ink/65">
                            {formatTime(shoot.endsAt, data.timezone)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          {shoot.projectId && projectMap.get(shoot.projectId) ? (
                            <p className="truncate text-[8px] font-black uppercase tracking-wider text-ink/70">
                              {projectMap.get(shoot.projectId)}
                            </p>
                          ) : null}
                          <h4 className="truncate font-display text-xs font-black uppercase tracking-tight text-ink">
                            {shoot.title}
                          </h4>
                          {shoot.locationName ? (
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-bold text-ink/70">
                              <Icon name="location" />
                              <span className="truncate">{shoot.locationName}</span>
                            </p>
                          ) : null}
                        </div>

                        <span className="grid size-7 place-items-center rounded-full bg-white/80 text-ink shadow-sm">
                          <Icon name="arrow" />
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between rounded-r12 border border-dashed border-stroke/70 bg-surface/30 px-3 py-2 text-[10px] text-secondary/60">
                    <span>
                      <LocalizedText vi="Không có lịch quay" en="No shoots scheduled" />
                    </span>
                    <Link
                      href="/shoots"
                      className="font-black text-pink hover:underline"
                    >
                      + <LocalizedText vi="Thêm" en="Add" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CalendarDayTimelineView({
  anchor,
  data,
  searchParams,
  projectMap,
  todayKey,
  anchorKey,
  now,
}: {
  anchor: Date;
  data: PageData;
  searchParams: SearchParams;
  projectMap: Map<string, string>;
  todayKey: string;
  anchorKey: string;
  now: Date;
}) {
  const dayShoots = [...data.shoots].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );

  // Calculate dynamic hourly window
  let minHour = 7;
  let maxHour = 20;

  for (const shoot of dayShoots) {
    const sHour = zonedTimeParts(shoot.startsAt, data.timezone).hour;
    const eHour = zonedTimeParts(shoot.endsAt, data.timezone).hour;
    const eMinute = zonedTimeParts(shoot.endsAt, data.timezone).minute;
    if (sHour < minHour) minHour = Math.max(0, sHour);
    if (eHour > maxHour) maxHour = Math.min(23, eHour + (eMinute > 0 ? 1 : 0));
  }

  const timelineHours: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    timelineHours.push(h);
  }

  const isToday = anchorKey === todayKey;
  const nowParts = zonedTimeParts(now, data.timezone);

  // Unique projects count
  const uniqueProjects = new Set(
    dayShoots.map((s) => s.projectId).filter(Boolean)
  );

  return (
    <section className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white p-4 sm:p-5 shadow-sm">
      {/* Day Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-black/[0.05] pb-3 sm:pb-3.5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            <LocalizedDateTime
              value={anchor.toISOString()}
              options={{
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: data.timezone,
              }}
              uppercase
            />
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            href={queryHref("week", anchor, searchParams, data.timezone)}
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-full border border-black/[0.06] bg-surface px-3 text-[11px] font-black text-ink shadow-xs transition hover:bg-white active:scale-press"
          >
            <Icon name="calendar" />
            <LocalizedText vi="Xem cả tuần" en="View week" />
          </Link>

          <Link
            href={queryHref("month", anchor, searchParams, data.timezone)}
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-full border border-black/[0.06] bg-surface px-3 text-[11px] font-black text-ink shadow-xs transition hover:bg-white active:scale-press"
          >
            <LocalizedText vi="Xem cả tháng" en="View month" />
          </Link>

          <Link
            href="/shoots"
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-full bg-ink px-3.5 text-[11px] font-black text-white shadow-soft transition hover:bg-pink active:scale-press"
          >
            <Icon name="plus" />
            <LocalizedText vi="Tạo lịch quay" en="Create shoot" />
          </Link>
        </div>
      </div>

      {/* Day Metrics Badge Strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-stroke/70 bg-white/80 px-3 py-1 text-xs font-black text-ink shadow-soft">
          <span className="size-2 rounded-full bg-pink" />
          <span>
            {dayShoots.length}{" "}
            <LocalizedText
              vi="buổi quay trong ngày"
              en="shoots today"
            />
          </span>
        </span>

        {uniqueProjects.size > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-stroke/60 bg-surface px-2.5 py-1 text-[11px] font-black text-ink shadow-soft">
            <span className="size-1.5 rounded-full bg-[#7a58ec]" />
            <span>
              {uniqueProjects.size} <LocalizedText vi="dự án" en="projects" />
            </span>
          </span>
        ) : null}

        {isToday ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-1 text-[11px] font-black text-pink">
            <span className="size-2 rounded-full bg-pink animate-ping" />
            <LocalizedText vi="Hôm nay" en="Today" />
          </span>
        ) : null}
      </div>

      {/* If no shoots today, show clean notification card */}
      {dayShoots.length === 0 ? (
        <div className="mt-4 rounded-r22 border border-dashed border-stroke bg-surface/70 px-4 py-8 sm:py-10 text-center shadow-soft">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-white border border-stroke text-secondary shadow-soft">
            <Icon name="calendar" />
          </div>
          <h3 className="mt-3 font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            <LocalizedText
              vi="Không có lịch quay nào trong ngày này"
              en="No shoots scheduled for this day"
            />
          </h3>
          <p className="mt-1 text-xs text-secondary font-medium max-w-md mx-auto">
            <LocalizedText
              vi="Lịch trình của bạn hoàn toàn trống. Bạn có thể thêm buổi quay mới hoặc kiểm tra các ngày khác."
              en="Your schedule is completely clear. You can create a new shoot or navigate to other dates."
            />
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href="/shoots"
              className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-ink px-4 text-xs font-black text-white shadow-soft transition hover:bg-ink/90 active:scale-press"
            >
              <Icon name="plus" />
              <LocalizedText vi="Tạo buổi quay mới" en="Schedule a shoot" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* THE HOURLY TIMELINE TRACK */}
      <div className="mt-4 sm:mt-5 relative rounded-r22 border border-stroke/70 bg-white/70 p-2 sm:p-4 shadow-soft">
        <div className="space-y-3 sm:space-y-4">
          {timelineHours.map((hour) => {
            const hourLabel = `${String(hour).padStart(2, "0")}:00`;
            const startingShoots = dayShoots.filter(
              (s) => zonedTimeParts(s.startsAt, data.timezone).hour === hour
            );
            const ongoingShoots = dayShoots.filter((s) => {
              const sHour = zonedTimeParts(s.startsAt, data.timezone).hour;
              const eParts = zonedTimeParts(s.endsAt, data.timezone);
              return sHour < hour && (eParts.hour > hour || (eParts.hour === hour && eParts.minute > 0));
            });
            const isCurrentHour = isToday && nowParts.hour === hour;

            return (
              <div key={hour} className="relative">
                {/* Current Time Indicator line if within this hour */}
                {isCurrentHour ? (
                  <div className="relative z-10 my-2 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-pill bg-pink px-2.5 py-0.5 text-[9px] font-black uppercase text-white shadow-soft">
                      <span className="size-1.5 rounded-full bg-white animate-ping" />
                      <LocalizedText vi="Hiện tại" en="Now" />
                      <span className="font-mono tabular-nums">
                        {formatTime(now, data.timezone)}
                      </span>
                    </span>
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-pink via-pink/80 to-transparent" />
                  </div>
                ) : null}

                <div className="grid grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[76px_minmax(0,1fr)] gap-2 sm:gap-4 items-start">
                  {/* Hour Label & Node Marker */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 pr-1 pt-1 text-right">
                    <span className="font-mono text-[11px] sm:text-xs font-black text-secondary tabular-nums">
                      {hourLabel}
                    </span>
                    <span
                      className={`size-2 shrink-0 rounded-full border-2 ${
                        startingShoots.length > 0
                          ? "border-pink bg-pink"
                          : isCurrentHour
                          ? "border-pink bg-white"
                          : "border-stroke bg-surface"
                      }`}
                    />
                  </div>

                  {/* Hour Content: Starting shoots or Ongoing shoots or Empty slot */}
                  <div className="min-w-0 flex-1 space-y-2.5 border-t border-stroke/50 pt-1">
                    {startingShoots.length > 0 ? (
                      startingShoots.map((shoot, shootIndex) => {
                        const tone =
                          eventTones[shootIndex % eventTones.length];
                        const dotTone =
                          toneAccentDots[shootIndex % toneAccentDots.length];

                        return (
                          <Link
                            key={shoot.id}
                            href={`/shoots/${shoot.id}`}
                            className={`group/card block rounded-r20 p-3 sm:p-4 transition-all duration-base hover:-translate-y-0.5 hover:shadow-soft active:scale-[.99] ${tone} ${isPastOrCompletedShoot(shoot, now) ? "opacity-45 grayscale-[35%]" : ""}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`size-2 shrink-0 rounded-full ${dotTone}`}
                                />
                                <span className="font-mono text-xs sm:text-sm font-black text-ink tabular-nums">
                                  {formatTime(shoot.startsAt, data.timezone)} —{" "}
                                  {formatTime(shoot.endsAt, data.timezone)}
                                </span>
                                <span className="rounded-pill bg-white/70 px-2 py-0.5 text-[10px] font-black text-ink shadow-xs">
                                  {shootDuration(shoot.startsAt, shoot.endsAt)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <StatusChip
                                  tone={statusToneMap[shoot.status] ?? "neutral"}
                                >
                                  <LocalizedText
                                    vi={
                                      statusLabels[shoot.status]?.vi ??
                                      shoot.status
                                    }
                                    en={
                                      statusLabels[shoot.status]?.en ??
                                      shoot.status
                                    }
                                  />
                                </StatusChip>
                              </div>
                            </div>

                            {/* Shoot Main Body */}
                            <div className="mt-2.5 flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {shoot.projectId &&
                                projectMap.get(shoot.projectId) ? (
                                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-ink/70">
                                    {projectMap.get(shoot.projectId)}
                                  </p>
                                ) : null}

                                <h3 className="mt-0.5 font-display text-lg sm:text-2xl font-black uppercase tracking-tight text-ink leading-tight">
                                  {shoot.title}
                                </h3>

                                {shoot.locationName ? (
                                  <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-ink/80 truncate">
                                    <Icon name="location" />
                                    <span>{shoot.locationName}</span>
                                    {shoot.locationAddress ? (
                                      <span className="text-ink/60 font-medium truncate">
                                        • {shoot.locationAddress}
                                      </span>
                                    ) : null}
                                  </p>
                                ) : null}


                              </div>

                              <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-white/80 text-ink shadow-sm transition group-hover/card:bg-ink group-hover/card:text-white">
                                <Icon name="arrow" />
                              </span>
                            </div>
                          </Link>
                        );
                      })
                    ) : ongoingShoots.length > 0 ? (
                      <div className="space-y-1">
                        {ongoingShoots.map((s) => (
                          <Link
                            key={s.id}
                            href={`/shoots/${s.id}`}
                            className={`flex items-center justify-between rounded-r12 border border-dashed border-stroke/80 bg-surface/80 px-3 py-1.5 text-xs font-bold text-secondary hover:bg-white hover:text-ink transition-colors ${isPastOrCompletedShoot(s, now) ? "opacity-45 grayscale-[35%]" : ""}`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="size-1.5 rounded-full bg-pink" />
                              <span className="truncate text-ink">{s.title}</span>
                              <span className="text-[10px] text-secondary">
                                (
                                <LocalizedText
                                  vi={`tiếp tục đến ${formatTime(
                                    s.endsAt,
                                    data.timezone
                                  )}`}
                                  en={`ongoing until ${formatTime(
                                    s.endsAt,
                                    data.timezone
                                  )}`}
                                />
                                )
                              </span>
                            </span>
                            <span className="text-[10px] font-black text-pink">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="group flex items-center justify-between py-1 text-secondary/40 hover:text-secondary">
                        <span className="text-[10px] font-bold tracking-wide">
                          —
                        </span>
                        <Link
                          href="/shoots"
                          className="text-[10px] font-black text-secondary/40 opacity-0 group-hover:opacity-100 group-hover:text-pink transition-opacity hover:underline"
                        >
                          + <LocalizedText vi="Lập lịch" en="Schedule" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
