import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { StatusChip } from "@/components/ui/status-chip";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
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
import { getInitialOrganization } from "@/server/organization-context";

export const dynamic = "force-dynamic";

type SearchParams = {
  view?: string;
  date?: string;
  projectId?: string;
  crewMemberId?: string;
  equipmentItemId?: string;
};

type PageData = {
  shoots: Shoot[];
  projects: Array<{ id: string; name: string }>;
  crew: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  timezone: string;
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
};

const statusLabels: Record<string, { vi: string; en: string }> = {
  confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
  planned: { vi: "Kế hoạch", en: "Planned" },
  completed: { vi: "Hoàn thành", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
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
  return value === "week" || value === "day" ? value : "month";
}

function safeDate(value?: string) {
  const date = value ? new Date(`${value}T12:00:00Z`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function monthLabels(anchor: Date, timeZone: string) {
  const en = new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(anchor).toUpperCase();

  const vi = new Intl.DateTimeFormat("vi", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(anchor).toUpperCase();

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
  filters: { projectId?: string; crewMemberId?: string; equipmentItemId?: string },
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

    const organization = await getInitialOrganization();
    const queryRange =
      view === "month"
        ? monthGridRange(anchor, organization.timezone)
        : calendarRange(view, anchor, organization.timezone);
    const [shoots, filterOptions] = await Promise.all([
      createCalendarService(createCalendarRepository(db)).list(
        organization.id,
        queryRange.start,
        queryRange.end,
        filters,
      ),
      getCalendarFilterOptions(organization.id),
    ]);

    return { shoots, ...filterOptions, timezone: organization.timezone };
  } catch (error) {
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
  for (const key of ["projectId", "crewMemberId", "equipmentItemId"] as const) {
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

  const cleanParams: SearchParams = {
    view,
    date: searchParams.date,
    projectId,
    crewMemberId,
    equipmentItemId,
  };

  const data = await loadData(anchor, view, {
    projectId,
    crewMemberId,
    equipmentItemId,
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
    .filter((shoot) => shoot.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = (
    futureShoots.length > 0
      ? futureShoots
      : [...data.shoots].sort(
          (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
        )
  ).slice(0, 3);

  const viewItems: Array<{ view: CalendarView; vi: string; en: string }> = [
    { view: "week", vi: "Tuần", en: "Week" },
    { view: "month", vi: "Tháng", en: "Month" },
    { view: "day", vi: "Dòng", en: "Timeline" },
  ];

  const monthLabelsObj = monthLabels(anchor, data.timezone);
  const periodObj = periodLabels(view, anchor, range.start, range.end, data.timezone);

  const hasActiveFilters = Boolean(
    projectId || crewMemberId || equipmentItemId,
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

  return (
    <AppScreen className="max-w-[1180px] pb-40 pt-4 sm:pb-36 sm:pt-6 lg:pb-10 lg:pt-8">
      {/* Top Header Bar */}
      <header className="mx-auto max-w-[1040px]">
        <div className="flex items-center justify-between gap-2 pr-12 sm:pr-14 lg:pr-0">
          <Link
            href={queryHref("month", anchor, cleanParams, data.timezone)}
            className="group inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-pill border border-stroke/80 bg-surface/90 px-3 text-xs sm:text-sm font-black tracking-[-0.02em] text-ink shadow-soft transition-all duration-fast hover:bg-white active:scale-press"
          >
            <LocalizedText vi={monthLabelsObj.vi} en={monthLabelsObj.en} />
            <span className="text-[10px] sm:text-xs text-secondary group-hover:text-ink transition-colors">
              ⌄
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label="Search calendar"
              className="grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
            >
              <Icon name="search" />
            </button>

            <a
              href="#calendar-filters"
              aria-label="Filter calendar"
              className={`relative grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press ${
                hasActiveFilters ? "ring-2 ring-pink ring-offset-1" : ""
              }`}
            >
              <Icon name="filter" />
              {hasActiveFilters ? (
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-pink ring-2 ring-white" />
              ) : null}
            </a>

            <Link
              href="/shoots"
              aria-label="Create shoot"
              className="group grid size-11 place-items-center rounded-full bg-ink text-white shadow-soft transition-all duration-fast hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 active:scale-press"
            >
              <Icon name="plus" />
            </Link>
            <WorkspaceMenu />
          </div>
        </div>

        {/* Title and Editorial Subheading */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="font-display text-[clamp(2.6rem,10.5vw,5.2rem)] font-black uppercase leading-[0.82] tracking-[-0.06em] text-ink break-words">
              {view === "week" ? (
                <LocalizedText vi="Tuần" en="Week" />
              ) : view === "day" ? (
                <LocalizedText vi="Ngày" en="Day" />
              ) : (
                <LocalizedText vi="Tháng" en="Month" />
              )}
              <span className="ml-0.5 text-pink">*</span>
            </h1>
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.28em] text-secondary sm:text-xs">
              <LocalizedText vi="Lịch sản xuất" en="Production Calendar" />
            </p>
          </div>

          {/* Quick Month Metrics Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-stroke/80 bg-white/70 px-3 py-1.5 text-[11px] font-black text-ink shadow-soft backdrop-blur-sm sm:text-xs">
              <span className="size-2 rounded-full bg-pink" />
              <span>
                {data.shoots.length}{" "}
                <LocalizedText vi="buổi quay" en="shoots" />
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Toolbar: Previous, Today, Next & Segmented View Controls */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={queryHref(view, previous, cleanParams, data.timezone)}
              aria-label="Previous period"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
            >
              <span className="rotate-180">
                <Icon name="arrow" />
              </span>
            </Link>

            <Link
              href={queryHref(view, new Date(), cleanParams, data.timezone)}
              className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-[11px] sm:text-xs font-black tracking-tight shadow-soft transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press ${
                isViewingCurrentPeriod
                  ? "border-pink/40 bg-pink/10 text-pink"
                  : "border-stroke/70 bg-surface text-ink hover:bg-white"
              }`}
            >
              <LocalizedText vi="Hôm nay" en="Today" />
            </Link>

            <Link
              href={queryHref(view, next, cleanParams, data.timezone)}
              aria-label="Next period"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
            >
              <Icon name="arrow" />
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="grid min-w-0 flex-1 sm:flex-initial sm:w-64 grid-cols-3 rounded-pill border border-stroke/70 bg-white/70 p-0.5 sm:p-1 shadow-soft">
              {viewItems.map((item) => (
                <Link
                  key={item.view}
                  href={queryHref(
                    item.view,
                    anchor,
                    cleanParams,
                    data.timezone,
                  )}
                  className={`grid min-h-8 sm:min-h-9 min-w-0 place-items-center rounded-pill px-1.5 sm:px-3 text-[11px] font-black transition-all duration-fast sm:text-xs truncate ${
                    view === item.view
                      ? "bg-ink text-white shadow-sm"
                      : "text-secondary hover:text-ink"
                  }`}
                >
                  <LocalizedText vi={item.vi} en={item.en} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Formatted Period Subtitle */}
        <div className="mt-2.5 flex items-center justify-center">
          <p className="inline-flex items-center gap-2 rounded-pill bg-surface/70 px-3.5 py-1 text-center text-xs font-black tracking-tight text-ink border border-stroke/50 shadow-soft sm:text-sm">
            <span className="size-1.5 rounded-full bg-pink" />
            <LocalizedText vi={periodObj.vi} en={periodObj.en} />
          </p>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
              <LocalizedText vi="Đang lọc:" en="Filtered by:" />
            </span>
            {projectId ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                <span>{selectedProject?.name || <LocalizedText vi="Dự án đã chọn" en="Selected project" />}</span>
                <Link
                  href={queryHref(
                    view,
                    anchor,
                    { ...cleanParams, projectId: undefined },
                    data.timezone,
                  )}
                  className="hover:opacity-70 font-bold"
                  aria-label="Remove project filter"
                >
                  ×
                </Link>
              </span>
            ) : null}
            {crewMemberId ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                <span>{selectedCrew?.name || <LocalizedText vi="Nhân sự đã chọn" en="Selected crew" />}</span>
                <Link
                  href={queryHref(
                    view,
                    anchor,
                    { ...cleanParams, crewMemberId: undefined },
                    data.timezone,
                  )}
                  className="hover:opacity-70 font-bold"
                  aria-label="Remove crew filter"
                >
                  ×
                </Link>
              </span>
            ) : null}
            {equipmentItemId ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-pink/10 border border-pink/25 px-2.5 py-0.5 text-[10px] font-black text-pink">
                <span>{selectedGear?.name || <LocalizedText vi="Thiết bị đã chọn" en="Selected gear" />}</span>
                <Link
                  href={queryHref(
                    view,
                    anchor,
                    { ...cleanParams, equipmentItemId: undefined },
                    data.timezone,
                  )}
                  className="hover:opacity-70 font-bold"
                  aria-label="Remove gear filter"
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
      </header>

      {/* Database Error Banner */}
      {data.error ? (
        <div className="mx-auto mt-4 max-w-[1040px]">
          <DatabaseErrorBanner error={data.error} />
        </div>
      ) : null}

      {/* Filter Empty State Banner */}
      {hasActiveFilters && data.shoots.length === 0 && !data.error ? (
        <div className="mx-auto mt-4 max-w-[1040px] rounded-r22 border border-dashed border-ink/20 bg-surface/90 p-4 sm:p-5 text-center shadow-soft">
          <p className="font-display text-lg sm:text-xl font-black uppercase tracking-tight text-ink">
            <LocalizedText
              vi="Không có buổi quay phù hợp"
              en="No matching shoots found"
            />
          </p>
          <p className="mt-1 text-xs sm:text-sm font-medium text-secondary">
            <LocalizedText
              vi="Không tìm thấy buổi quay nào phù hợp với bộ lọc đã chọn trong khoảng thời gian này."
              en="No shoots match the selected filters in this time range."
            />
          </p>
          <div className="mt-3">
            <Link
              href={queryHref(view, anchor, {}, data.timezone)}
              className="inline-flex h-8 sm:h-9 items-center rounded-pill bg-ink px-3.5 text-xs font-black text-white shadow-soft transition hover:bg-pink active:scale-press"
            >
              <LocalizedText vi="Xóa tất cả bộ lọc" en="Reset all filters" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* PRIMARY CALENDAR VIEW EXPERIENCE */}
      {view === "month" ? (
        <section className="mx-auto mt-4 sm:mt-5 max-w-[1040px] overflow-hidden rounded-r24 sm:rounded-r28 border border-stroke/80 bg-white/60 shadow-soft backdrop-blur-sm">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-stroke/70 bg-surface/90 py-2 sm:py-2.5 text-center">
            {weekHeaders.map((day) => (
              <div
                key={day.en}
                className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.08em]"
              >
                <span className={day.isWeekend ? "text-pink" : "text-secondary"}>
                  <LocalizedText vi={day.vi} en={day.en} />
                </span>
              </div>
            ))}
          </div>

          {/* 7-Column Month Days Grid */}
          <div className="grid grid-cols-7">
            {monthGridDays.map((day, dayIndex) => {
              const key = dateKey(day, data.timezone);
              const shoots = grouped.get(key) ?? [];
              const isToday = key === todayKey;
              const dayParts = zonedDateParts(day, data.timezone);
              const outsideMonth = dayParts.month !== anchorMonth;

              return (
                <article
                  key={key}
                  className={`group relative flex flex-col justify-between border-b border-r border-stroke/60 transition-colors duration-fast ${
                    outsideMonth
                      ? "bg-[#faf5f8]/45 hover:bg-white/60 text-secondary/40"
                      : isToday
                      ? "bg-pink/[0.04] hover:bg-white/90"
                      : "bg-surface/50 hover:bg-white"
                  } min-h-[70px] p-1 sm:min-h-[96px] sm:p-1.5 lg:min-h-[120px] lg:p-2`}
                >
                  {/* Day Cell Top: Date number and indicators */}
                  <div className="flex items-center justify-between gap-1">
                    <Link
                      href={queryHref("day", day, cleanParams, data.timezone)}
                      className={`grid size-5 sm:size-6 lg:size-7 place-items-center rounded-full text-[10px] sm:text-[11px] lg:text-xs font-black transition-all duration-fast ${
                        isToday
                          ? "bg-pink text-white shadow-soft ring-2 ring-pink/20 scale-105"
                          : outsideMonth
                          ? "text-secondary/40 hover:bg-ink/5"
                          : "text-ink hover:bg-ink hover:text-white"
                      }`}
                      title={
                        isToday
                          ? "Today"
                          : new Intl.DateTimeFormat("en", {
                              timeZone: data.timezone,
                              dateStyle: "medium",
                            }).format(day)
                      }
                    >
                      {dayParts.day}
                    </Link>

                    {isToday ? (
                      <span className="hidden sm:inline-flex items-center rounded-pill bg-pink/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-pink">
                        <LocalizedText vi="Hôm nay" en="Today" />
                      </span>
                    ) : shoots.length > 0 ? (
                      <span className="text-[9px] font-black text-secondary/60 pr-0.5 tabular-nums">
                        {shoots.length}
                      </span>
                    ) : null}
                  </div>

                  {/* Day Cell Events List */}
                  <div className="mt-1 flex flex-1 flex-col gap-1 min-w-0">
                    {shoots.slice(0, 2).map((shoot, shootIndex) => {
                      const tone =
                        eventTones[
                          (dayIndex + shootIndex) % eventTones.length
                        ];
                      const dotTone =
                        toneAccentDots[
                          (dayIndex + shootIndex) % toneAccentDots.length
                        ];

                      return (
                        <Link
                          key={shoot.id}
                          href={`/shoots/${shoot.id}`}
                          title={`${shoot.title} (${formatTime(
                            shoot.startsAt,
                            data.timezone,
                          )})`}
                          className={`group/item block w-full min-w-0 rounded-[5px] sm:rounded-r10 px-1 sm:px-1.5 py-0.5 sm:py-1 text-left transition-all duration-fast hover:-translate-y-0.5 hover:shadow-sm active:scale-press ${tone}`}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={`size-1.5 shrink-0 rounded-full ${dotTone}`}
                            />
                            <span className="hidden lg:inline text-[9px] font-black text-ink/70 tabular-nums">
                              {formatTime(shoot.startsAt, data.timezone)}
                            </span>
                            <span className="truncate text-[8px] sm:text-[9px] lg:text-[10px] font-black leading-tight text-ink">
                              {shoot.title}
                            </span>
                          </div>
                        </Link>
                      );
                    })}

                    {shoots.length > 2 ? (
                      <Link
                        href={queryHref(
                          "day",
                          day,
                          cleanParams,
                          data.timezone,
                        )}
                        className="mt-auto block text-center rounded-pill bg-ink/5 hover:bg-ink hover:text-white px-1 py-0.5 text-[7px] sm:text-[8px] lg:text-[9px] font-black leading-none text-secondary transition-colors"
                      >
                        +{shoots.length - 2} <LocalizedText vi="khác" en="more" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : view === "week" ? (
        <CalendarWeekView
          anchor={anchor}
          data={data}
          searchParams={cleanParams}
          projectMap={projectMap}
          todayKey={todayKey}
          anchorKey={anchorKey}
          weekDaysList={weekDaysList}
          grouped={grouped}
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

      {/* Visual Accent Legend Bar */}
      <div className="mx-auto mt-4 sm:mt-5 flex max-w-[1040px] items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-stroke/70 bg-surface/80 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-secondary shadow-soft sm:px-3 sm:py-2 sm:text-xs">
          <LocalizedText vi="Tông màu trực quan" en="Visual Accents" />
        </span>
        {[
          ["bg-[#7a58ec]", "Lilac", "Tím nhạt"],
          ["bg-[#1da875]", "Mint", "Bạc hà"],
          ["bg-[#e59b00]", "Yellow", "Vàng"],
          ["bg-[#2d7bf4]", "Sky", "Xanh trời"],
          ["bg-[#ff4f9a]", "Coral", "San hô"],
        ].map(([dot, en, vi]) => (
          <span
            key={en}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-stroke/70 bg-surface/80 px-2.5 py-1.5 text-[10px] font-black text-ink shadow-soft sm:px-3 sm:py-2 sm:text-xs"
          >
            <span className={`size-2 rounded-full ${dot}`} />
            <LocalizedText vi={vi} en={en} />
          </span>
        ))}
        <span className="inline-flex shrink-0 items-center rounded-pill border border-stroke/50 bg-white/50 px-2.5 py-1.5 text-[10px] font-bold text-secondary shadow-soft sm:px-3 sm:py-2 sm:text-xs">
          <LocalizedText
            vi="Xoay vòng theo lịch để phân biệt các buổi quay"
            en="Rotated cyclically to distinguish scheduled shoots"
          />
        </span>
      </div>

      {/* Upcoming Shoots This Month */}
      <section className="mx-auto mt-6 sm:mt-8 max-w-[1040px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink">
              <LocalizedText vi="LỊCH TRÌNH" en="SCHEDULE" />
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-[-0.04em] text-ink">
              <LocalizedText
                vi="Sắp tới trong tháng"
                en="Upcoming this month"
              />
              <span className="text-pink">*</span>
            </h2>
          </div>

          <Link
            href="/shoots"
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-pill border border-stroke/70 bg-surface px-3 text-[10px] font-black text-ink shadow-soft transition hover:bg-white active:scale-press sm:text-xs"
          >
            <LocalizedText vi="Xem tất cả" en="View all" />
            <Icon name="arrow" />
          </Link>
        </div>

        {upcoming.length ? (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((shoot, index) => (
              <Link
                key={shoot.id}
                href={`/shoots/${shoot.id}`}
                className={`grid min-h-24 grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-r22 p-3 sm:p-3.5 transition-all duration-base hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.99] ${
                  eventTones[index % eventTones.length]
                }`}
              >
                <div className="flex flex-col justify-center border-r border-ink/10 pr-2 sm:pr-3 text-center">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-ink/75">
                    {new Intl.DateTimeFormat("en", {
                      timeZone: data.timezone,
                      month: "short",
                    }).format(shoot.startsAt)}
                  </span>
                  <span className="font-display text-2xl sm:text-3xl font-black leading-none text-ink">
                    {new Intl.DateTimeFormat("en", {
                      timeZone: data.timezone,
                      day: "numeric",
                    }).format(shoot.startsAt)}
                  </span>
                </div>
                <div className="min-w-0 self-center">
                  {shoot.projectId && projectMap.get(shoot.projectId) ? (
                    <p className="truncate text-[9px] font-black uppercase tracking-wider text-ink/65">
                      {projectMap.get(shoot.projectId)}
                    </p>
                  ) : null}
                  <p className="truncate text-xs font-black text-ink sm:text-sm">
                    {shoot.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-bold text-ink/75">
                    {formatTime(shoot.startsAt, data.timezone)} —{" "}
                    {formatTime(shoot.endsAt, data.timezone)}
                  </p>
                  {shoot.locationName ? (
                    <p className="mt-0.5 truncate text-[9px] font-medium text-ink/60">
                      ⌖ {shoot.locationName}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-r22 border border-dashed border-stroke bg-surface/60 px-4 py-8 text-center text-xs font-bold text-secondary">
            <LocalizedText
              vi="Chưa có lịch quay sắp tới trong khoảng này."
              en="No upcoming shoots in this range yet."
            />
          </div>
        )}
      </section>

      {/* Calendar Filter Controls Accordion */}
      <details
        id="calendar-filters"
        open={hasActiveFilters ? true : undefined}
        className="mx-auto mt-5 sm:mt-7 max-w-[1040px] rounded-r24 sm:rounded-r28 border border-stroke bg-surface/90 p-3.5 sm:p-5 shadow-soft transition-all"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-r12 text-xs font-black uppercase tracking-[0.14em] text-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
          <span className="flex items-center gap-2">
            <Icon name="filter" />
            <LocalizedText vi="Bộ lọc lịch" en="Calendar filters" />
            {hasActiveFilters ? (
              <span className="rounded-pill bg-pink/15 px-2 py-0.5 text-[9px] font-black text-pink">
                <LocalizedText vi="Đang lọc" en="Active" />
              </span>
            ) : null}
          </span>
          <span className="text-sm">⌄</span>
        </summary>

        <form action="/calendar" method="GET" className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="view" value={view} />
          <input
            type="hidden"
            name="date"
            value={dateKey(anchor, data.timezone)}
          />

          <select
            name="projectId"
            defaultValue={projectId ?? ""}
            aria-label="Filter by project"
            className="h-10 sm:h-11 w-full min-w-0 rounded-r16 border border-stroke bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-ink/40 transition-colors"
          >
            <option value="">
              <LocalizedText vi="Tất cả dự án" en="All projects" />
            </option>
            {data.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            name="crewMemberId"
            defaultValue={crewMemberId ?? ""}
            aria-label="Filter by crew member"
            className="h-10 sm:h-11 w-full min-w-0 rounded-r16 border border-stroke bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-ink/40 transition-colors"
          >
            <option value="">
              <LocalizedText vi="Tất cả nhân sự" en="All crew" />
            </option>
            {data.crew.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            name="equipmentItemId"
            defaultValue={equipmentItemId ?? ""}
            aria-label="Filter by equipment"
            className="h-10 sm:h-11 w-full min-w-0 rounded-r16 border border-stroke bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-ink/40 transition-colors"
          >
            <option value="">
              <LocalizedText vi="Tất cả thiết bị" en="All gear" />
            </option>
            {data.equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-10 sm:h-11 rounded-pill bg-ink px-4 text-xs sm:text-sm font-black text-white shadow-soft transition hover:bg-ink/90 active:scale-press"
          >
            <LocalizedText vi="Áp dụng" en="Apply" />
          </button>

          <Link
            href={queryHref(view, anchor, {}, data.timezone)}
            className="grid h-10 sm:h-11 place-items-center rounded-pill border border-stroke bg-white px-4 text-xs sm:text-sm font-black text-ink shadow-soft transition hover:bg-surface active:scale-press"
          >
            <LocalizedText vi="Xóa lọc" en="Clear" />
          </Link>
        </form>
      </details>
    </AppScreen>
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
  const confirmedCount = data.shoots.filter((s) => s.status === "confirmed").length;

  return (
    <section className="mx-auto mt-4 sm:mt-5 max-w-[1040px] overflow-hidden rounded-r24 sm:rounded-r28 border border-stroke/80 bg-white/60 p-2.5 sm:p-5 shadow-soft backdrop-blur-sm">
      {/* Week Overview Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stroke/70 pb-3 sm:pb-4">
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

      {/* DESKTOP & TABLET: FULL 7-DAY MULTI-COLUMN BOARD */}
      <div className="mt-4 hidden md:grid md:grid-cols-7 divide-x divide-stroke/70 rounded-r22 border border-stroke/70 bg-white/60 overflow-hidden shadow-soft">
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
              className={`flex flex-col min-h-[380px] lg:min-h-[440px] transition-colors ${
                isToday
                  ? "bg-pink/[0.03]"
                  : isAnchor
                  ? "bg-surface/90"
                  : "bg-surface/40 hover:bg-white/60"
              }`}
            >
              {/* Column Header */}
              <div className="border-b border-stroke/70 p-2 sm:p-2.5 text-center bg-surface/80">
                <p
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    header.isWeekend ? "text-pink" : "text-secondary"
                  }`}
                >
                  <LocalizedText vi={header.vi} en={header.en} />
                </p>
                <Link
                  href={queryHref("day", day, searchParams, data.timezone)}
                  className={`mt-1 inline-grid size-7 lg:size-8 place-items-center rounded-full font-display text-base lg:text-lg font-black transition-all hover:scale-110 ${
                    isToday
                      ? "bg-pink text-white shadow-soft"
                      : isAnchor
                      ? "bg-ink text-white"
                      : "text-ink hover:bg-ink hover:text-white"
                  }`}
                >
                  {new Intl.DateTimeFormat("en", {
                    timeZone: data.timezone,
                    day: "numeric",
                  }).format(day)}
                </Link>

                <div className="mt-1">
                  {dayShoots.length > 0 ? (
                    <span className="inline-block rounded-pill bg-ink/5 px-2 py-0.5 text-[9px] font-black text-ink">
                      {dayShoots.length}{" "}
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
                {dayShoots.map((shoot, shootIndex) => {
                  const tone =
                    eventTones[(dayIndex + shootIndex) % eventTones.length];
                  const dotTone =
                    toneAccentDots[(dayIndex + shootIndex) % toneAccentDots.length];

                  return (
                    <Link
                      key={shoot.id}
                      href={`/shoots/${shoot.id}`}
                      title={`${shoot.title} (${formatTime(
                        shoot.startsAt,
                        data.timezone
                      )} — ${formatTime(shoot.endsAt, data.timezone)})`}
                      className={`group/card block rounded-r14 p-2 transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-press ${tone}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 min-w-0">
                          <span className={`size-1.5 shrink-0 rounded-full ${dotTone}`} />
                          <span className="truncate text-[9px] font-black text-ink/75 tabular-nums">
                            {formatTime(shoot.startsAt, data.timezone)}
                          </span>
                        </span>
                        <span className="text-[8px] font-bold text-ink/60 tabular-nums">
                          {shootDuration(shoot.startsAt, shoot.endsAt)}
                        </span>
                      </div>

                      {shoot.projectId && projectMap.get(shoot.projectId) ? (
                        <p className="mt-1 truncate text-[8px] font-black uppercase tracking-wider text-ink/65">
                          {projectMap.get(shoot.projectId)}
                        </p>
                      ) : null}

                      <h4 className="mt-0.5 font-display text-[11px] lg:text-xs font-black uppercase leading-tight tracking-tight text-ink line-clamp-2">
                        {shoot.title}
                      </h4>

                      {shoot.locationName ? (
                        <p className="mt-1 flex items-center gap-0.5 text-[8px] font-bold text-ink/70 truncate">
                          <Icon name="location" />
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
                  );
                })}

                {dayShoots.length === 0 ? (
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
        })}
      </div>

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
                        className={`grid grid-cols-[56px_minmax(0,1fr)_32px] items-center gap-2 rounded-r14 p-2.5 transition-all duration-fast hover:-translate-y-0.5 active:scale-press ${tone}`}
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
    if (shoot.callTime) {
      const cHour = zonedTimeParts(shoot.callTime, data.timezone).hour;
      if (cHour < minHour) minHour = Math.max(0, cHour);
    }
  }

  const timelineHours: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    timelineHours.push(h);
  }

  const isToday = anchorKey === todayKey;
  const nowParts = zonedTimeParts(now, data.timezone);

  // Earliest call time
  const shootsWithCallTime = dayShoots.filter((s) => s.callTime);
  const earliestCall =
    shootsWithCallTime.length > 0
      ? shootsWithCallTime.reduce(
          (earliest, s) => (s.callTime! < earliest ? s.callTime! : earliest),
          shootsWithCallTime[0].callTime!
        )
      : null;

  // Unique projects count
  const uniqueProjects = new Set(
    dayShoots.map((s) => s.projectId).filter(Boolean)
  );

  return (
    <section className="mx-auto mt-4 sm:mt-5 max-w-[1040px] overflow-hidden rounded-r24 sm:rounded-r28 border border-stroke/80 bg-white/60 p-3 sm:p-5 shadow-soft backdrop-blur-sm">
      {/* Day Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stroke/70 pb-3 sm:pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-pink animate-pulse" />
            <LocalizedText
              vi="LỊCH TRÌNH DÒNG THỜI GIAN"
              en="PRODUCTION TIMELINE"
            />
          </p>
          <h2 className="mt-0.5 font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-ink">
            {new Intl.DateTimeFormat("en", {
              timeZone: data.timezone,
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(anchor)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            href={queryHref("week", anchor, searchParams, data.timezone)}
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-pill border border-stroke/70 bg-surface px-3 text-[11px] font-black text-ink shadow-soft transition hover:bg-white active:scale-press"
          >
            <Icon name="calendar" />
            <LocalizedText vi="Xem cả tuần" en="View week" />
          </Link>

          <Link
            href={queryHref("month", anchor, searchParams, data.timezone)}
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-pill border border-stroke/70 bg-surface px-3 text-[11px] font-black text-ink shadow-soft transition hover:bg-white active:scale-press"
          >
            <LocalizedText vi="Xem cả tháng" en="View month" />
          </Link>

          <Link
            href="/shoots"
            className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-pill bg-ink px-3.5 text-[11px] font-black text-white shadow-soft transition hover:bg-ink/90 active:scale-press"
          >
            <Icon name="plus" />
            <LocalizedText vi="Tạo buổi quay" en="Create shoot" />
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

        {earliestCall ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-stroke/60 bg-surface px-2.5 py-1 text-[11px] font-black text-ink shadow-soft">
            <Icon name="clock" />
            <span>
              <LocalizedText vi="Call time sớm nhất: " en="Earliest call: " />
              {formatTime(earliestCall, data.timezone)}
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
                            className={`group/card block rounded-r20 p-3 sm:p-4 transition-all duration-base hover:-translate-y-0.5 hover:shadow-soft active:scale-[.99] ${tone}`}
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

                                {shoot.callTime ? (
                                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-pill bg-ink/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-ink">
                                    <Icon name="clock" />
                                    <span>
                                      <LocalizedText
                                        vi="Giờ tập trung (Call Time): "
                                        en="Call Time: "
                                      />
                                      {formatTime(
                                        shoot.callTime,
                                        data.timezone
                                      )}
                                    </span>
                                  </div>
                                ) : null}

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

                                {shoot.notes ? (
                                  <p className="mt-2 rounded-r10 bg-white/50 border border-ink/5 p-2 text-xs font-medium italic text-ink/80">
                                    &quot;{shoot.notes}&quot;
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
                            className="flex items-center justify-between rounded-r12 border border-dashed border-stroke/80 bg-surface/80 px-3 py-1.5 text-xs font-bold text-secondary hover:bg-white hover:text-ink transition-colors"
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
