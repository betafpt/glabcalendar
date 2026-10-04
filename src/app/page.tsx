import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/ui/status-chip";
import { Calendar, Category, Add, Location, Sun1, ArrowRight2 } from "@/components/ui/iconsax";
import { DEFAULT_APP_TIMEZONE, getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { TodayDashboardSummary } from "@/server/db/dashboard";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { OperationsStatus } from "@/components/dashboard/operations-status";

export const dynamic = "force-dynamic";

type TodayPageData = {
  summary: TodayDashboardSummary;
  timezone: string;
  error?: string;
};

async function loadToday(): Promise<TodayPageData> {
  let timezone = DEFAULT_APP_TIMEZONE;
  try {
    timezone = getServerConfig().appTimezone;
    const { organization } = await requireWorkspaceContext();
    const { getCachedDashboardToday } = await import("@/server/cached-loaders");
    const summary = await getCachedDashboardToday(
      organization.id,
      organization.timezone
    );
    return { summary, timezone: organization.timezone };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const fallbackSummary: TodayDashboardSummary = {
      timezone,
      anchor: new Date(),
      range: { start: new Date(), end: new Date() },
      totalShoots: 0,
      totalConflicts: 0,
      totalCrewConflicts: 0,
      totalEquipmentConflicts: 0,
      totalCrew: 0,
      totalEquipment: 0,
      checklistTotal: 0,
      checklistCompleted: 0,
      readinessPercent: 0,
      shootsWithConflicts: 0,
      shoots: [],
    };
    return {
      summary: fallbackSummary,
      timezone,
      error: errorMessage(error, "Unable to load today's schedule."),
    };
  }
}

function formatTime(date: Date | string, timeZone: string) {
  const d = date instanceof Date ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(validDate);
}

function shootDuration(startsAt: Date | string, endsAt: Date | string) {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const startTime = isNaN(start.getTime()) ? 0 : start.getTime();
  const endTime = isNaN(end.getTime()) ? 0 : end.getTime();
  const durationMs = Math.max(0, endTime - startTime);
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatDateLabels(anchor: Date | string, timeZone: string) {
  const d = anchor instanceof Date ? anchor : new Date(anchor);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const enFull = new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(validDate);

  const viFullRaw = new Intl.DateTimeFormat("vi", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(validDate);
  const viFull = viFullRaw.charAt(0).toUpperCase() + viFullRaw.slice(1);

  const monthShortEn = new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(validDate).toUpperCase();

  const monthShortVi = new Intl.DateTimeFormat("vi", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(validDate).toUpperCase();

  return { enFull, viFull, monthShortEn, monthShortVi };
}

const statusToneMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
  confirmed: "success",
  in_progress: "warning",
  completed: "neutral",
  cancelled: "error",
  planned: "warning",
};

const statusLabels: Record<string, { vi: string; en: string }> = {
  confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
  in_progress: { vi: "Đang diễn ra", en: "In progress" },
  planned: { vi: "Kế hoạch", en: "Planned" },
  completed: { vi: "Hoàn thành", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
};

export default async function TodayDashboard() {
  const { summary, timezone, error } = await loadToday();
  const rows = summary.shoots;
  const dateLabels = formatDateLabels(summary.anchor ?? new Date(), timezone);

  return (
    <AppScreen className="max-w-[1180px] pb-40 pt-4 sm:pb-36 sm:pt-6 lg:pb-10 lg:pt-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/calendar"
          className="group inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-pill border border-stroke/80 bg-surface/90 px-3 text-xs sm:text-sm font-black tracking-[-0.02em] text-ink shadow-soft transition-all duration-fast hover:bg-white active:scale-press"
        >
          <LocalizedText vi={dateLabels.monthShortVi} en={dateLabels.monthShortEn} />
          <span className="text-[10px] sm:text-xs text-secondary group-hover:text-ink transition-colors">
            →
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/calendar"
            className="grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
          >
            <Calendar size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Xem lịch" en="Calendar view" /></span>
          </Link>
          <Link
            href="/shoots"
            className="grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition-all duration-fast hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-press"
          >
            <Category size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Tất cả buổi quay" en="All shoots" /></span>
          </Link>
          <Link
            href="/shoots"
            className="group grid size-11 place-items-center rounded-full bg-ink text-white shadow-soft transition-all duration-fast hover:bg-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 active:scale-press"
          >
            <Add size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Tạo buổi quay mới" en="New shoot" /></span>
          </Link>
          <WorkspaceMenu />
        </div>
      </div>

      {/* Main Page Title Header */}
      <header className="mt-3 sm:mt-4 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-[clamp(2.5rem,10vw,4.8rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] text-ink sm:leading-[0.92]">
              <LocalizedText vi="Hôm nay" en="Today" />
              <span aria-hidden="true" className="text-pink">
                *
              </span>
            </h1>
            <p className="mt-3 sm:mt-3.5 text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-secondary">
              <LocalizedText
                vi="Lịch quay, nhân sự và mức sẵn sàng trong ngày."
                en="Your shoots, crew and production readiness at a glance."
              />
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusChip tone="pink">
              {rows.length} <LocalizedText vi="lịch" en="scheduled" />
            </StatusChip>
          </div>
        </div>
      </header>

      {/* Production Date Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-ink/10 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink">
            <LocalizedText vi="Ngày sản xuất" en="Production day" />
          </p>
          <p className="mt-1 text-lg font-black">
            <LocalizedText vi={dateLabels.viFull} en={dateLabels.enFull} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar?view=day"
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-stroke/80 bg-white/80 px-3.5 text-xs font-black text-ink shadow-soft transition-all duration-fast hover:bg-surface active:scale-press"
          >
            <LocalizedText vi="Dòng thời gian" en="Timeline view" />
            <span className="text-[11px] text-secondary">→</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid (Typed M3-T05 Query Model Summary) */}
      <section className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        <Link
          href="/shoots"
          prefetch={true}
          className="group rounded-r22 border border-stroke/80 bg-surface/90 p-4 shadow-soft transition-all duration-base hover:-translate-y-0.5 hover:bg-white hover:border-ink/15 active:scale-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
              <LocalizedText vi="Buổi quay" en="Shoots" />
            </span>
            <span className="size-2 rounded-full bg-pink" />
          </div>
          <p className="mt-2 font-display text-3xl sm:text-4xl font-black tracking-tight text-ink">
            {summary.totalShoots}
          </p>
          <p className="mt-1 text-[11px] font-bold text-secondary">
            <LocalizedText vi="Trong ngày hôm nay" en="Scheduled today" />
          </p>
        </Link>

        <Link
          href="/crew"
          prefetch={true}
          className="group rounded-r22 border border-stroke/80 bg-surface/90 p-4 shadow-soft transition-all duration-base hover:-translate-y-0.5 hover:bg-white hover:border-ink/15 active:scale-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
              <LocalizedText vi="Nhân sự" en="Crew" />
            </span>
            <span className="size-2 rounded-full bg-lilac border border-ink/10" />
          </div>
          <p className="mt-2 font-display text-3xl sm:text-4xl font-black tracking-tight text-ink">
            {summary.totalCrew}
          </p>
          <p className="mt-1 text-[11px] font-bold text-secondary">
            {summary.totalCrewConflicts > 0 ? (
              <span className="text-error font-extrabold">
                {summary.totalCrewConflicts}{" "}
                <LocalizedText
                  vi="xung đột"
                  en={summary.totalCrewConflicts === 1 ? "conflict" : "conflicts"}
                />
              </span>
            ) : (
              <LocalizedText vi="Được phân công" en="Assigned to sets" />
            )}
          </p>
        </Link>

        <Link
          href="/equipment"
          prefetch={true}
          className="group rounded-r22 border border-stroke/80 bg-surface/90 p-4 shadow-soft transition-all duration-base hover:-translate-y-0.5 hover:bg-white hover:border-ink/15 active:scale-press"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
              <LocalizedText vi="Thiết bị" en="Gear" />
            </span>
            <span className="size-2 rounded-full bg-mint border border-ink/10" />
          </div>
          <p className="mt-2 font-display text-3xl sm:text-4xl font-black tracking-tight text-ink">
            {summary.totalEquipment}
          </p>
          <p className="mt-1 text-[11px] font-bold text-secondary">
            {summary.totalEquipmentConflicts > 0 ? (
              <span className="text-error font-extrabold">
                {summary.totalEquipmentConflicts}{" "}
                <LocalizedText
                  vi="xung đột"
                  en={summary.totalEquipmentConflicts === 1 ? "conflict" : "conflicts"}
                />
              </span>
            ) : (
              <LocalizedText vi="Đang được đặt" en="Booked for shoots" />
            )}
          </p>
        </Link>

        <div
          className={`rounded-r22 border p-4 shadow-soft transition-all duration-base ${
            summary.totalConflicts > 0
              ? "border-error/30 bg-error/5 text-ink"
              : "border-stroke/80 bg-surface/90 text-ink"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary">
              <LocalizedText vi="Xung đột" en="Conflicts" />
            </span>
            <span
              className={`size-2 rounded-full ${
                summary.totalConflicts > 0 ? "bg-error" : "bg-success"
              }`}
            />
          </div>
          <p className="mt-2 font-display text-3xl sm:text-4xl font-black tracking-tight text-ink">
            {summary.totalConflicts}
          </p>
          <div className="mt-1 text-[11px] font-bold text-secondary">
            {summary.totalConflicts > 0 ? (
              <span className="text-error font-extrabold flex flex-wrap items-center gap-x-1.5">
                <span>
                  {summary.totalCrewConflicts}{" "}
                  <LocalizedText vi="nhân sự" en="crew" />
                </span>
                <span>·</span>
                <span>
                  {summary.totalEquipmentConflicts}{" "}
                  <LocalizedText vi="thiết bị" en="gear" />
                </span>
              </span>
            ) : (
              <span className="text-success font-extrabold">
                <LocalizedText vi="Tất cả sẵn sàng" en="All clear" />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Compact operations status */}
      {rows.length > 0 ? (
        <OperationsStatus
          readinessPercent={summary.readinessPercent}
          checklistCompleted={summary.checklistCompleted}
          checklistTotal={summary.checklistTotal}
          totalConflicts={summary.totalConflicts}
          totalCrewConflicts={summary.totalCrewConflicts}
          totalEquipmentConflicts={summary.totalEquipmentConflicts}
          shootsWithConflicts={summary.shootsWithConflicts}
          totalShoots={summary.totalShoots}
        />
      ) : null}

      {/* Database Error Banner */}
      {error ? <DatabaseErrorBanner error={error} className="mt-5" /> : null}

      {/* Shoots Schedule Timeline */}
      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink">
              <LocalizedText vi="LỊCH TRÌNH CHI TIẾT" en="SCHEDULE TIMELINE" />
            </p>
            <h2 className="mt-0.5 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-ink">
              <LocalizedText vi="Lịch quay hôm nay" en="Today's Shoots" />
            </h2>
          </div>
          <Link
            href="/calendar"
            prefetch={true}
            className="inline-flex items-center gap-1 text-xs font-black text-secondary hover:text-ink transition-colors"
          >
            <LocalizedText vi="Xem trên lịch" en="View on calendar" /> →
          </Link>
        </div>

        {rows.map(
          (
            {
              shoot,
              project,
              crewCount,
              equipmentCount,
              checklistTotal,
              checklistCompleted,
              conflictCount,
              crewConflictCount,
              equipmentConflictCount,
              readinessPercent,
            },
            index
          ) => {
            const tones = ["bg-lilac", "bg-mint", "bg-yellow", "bg-sky", "bg-coral"];
            const tone = tones[index % tones.length];
            const statusTone = statusToneMap[shoot.status] ?? "neutral";
            const statusLabel = statusLabels[shoot.status] ?? {
              vi: shoot.status,
              en: shoot.status,
            };

            return (
              <Link
                key={shoot.id}
                href={`/shoots/${shoot.id}`}
                prefetch={true}
                className={`group grid gap-4 rounded-r24 sm:rounded-r28 border border-ink/8 p-4 sm:p-5 shadow-soft transition-all duration-base hover:-translate-y-0.5 hover:shadow-md hover:border-ink/15 sm:grid-cols-[120px_minmax(0,1fr)_auto] ${tone}`}
              >
                {/* Time Column */}
                <div>
                  <p className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-ink">
                    {formatTime(shoot.startsAt, timezone)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-secondary">
                    {formatTime(shoot.endsAt, timezone)}
                  </p>
                  <span className="mt-2 inline-flex items-center rounded-pill bg-white/70 px-2 py-0.5 text-[10px] font-extrabold text-ink/80 shadow-xs">
                    {shootDuration(shoot.startsAt, shoot.endsAt)}
                  </span>
                </div>

                {/* Main Details Column */}
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-secondary">
                    {project ? (
                      `${project.name}${project.clientName ? ` · ${project.clientName}` : ""}`
                    ) : (
                      <LocalizedText vi="Không thuộc dự án" en="Independent shoot" />
                    )}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
                      {shoot.title}
                    </h3>
                    <StatusChip tone={statusTone}>
                      <LocalizedText vi={statusLabel.vi} en={statusLabel.en} />
                    </StatusChip>
                    {crewConflictCount > 0 || equipmentConflictCount > 0 ? (
                      <>
                        {crewConflictCount > 0 ? (
                          <StatusChip tone="error">
                            {crewConflictCount}{" "}
                            <LocalizedText
                              vi="xung đột nhân sự"
                              en={crewConflictCount === 1 ? "crew conflict" : "crew conflicts"}
                            />
                          </StatusChip>
                        ) : null}
                        {equipmentConflictCount > 0 ? (
                          <StatusChip tone="error">
                            {equipmentConflictCount}{" "}
                            <LocalizedText
                              vi="xung đột thiết bị"
                              en={equipmentConflictCount === 1 ? "gear conflict" : "gear conflicts"}
                            />
                          </StatusChip>
                        ) : null}
                      </>
                    ) : conflictCount > 0 ? (
                      <StatusChip tone="error">
                        {conflictCount} <LocalizedText vi="xung đột" en="conflicts" />
                      </StatusChip>
                    ) : (
                      <StatusChip tone="success">
                        <LocalizedText vi="Sẵn sàng" en="Clear" />
                      </StatusChip>
                    )}
                  </div>

                  <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary truncate">
                    <Location size={14} variant="Linear" className="shrink-0 text-secondary" />
                    <span>
                      {shoot.locationName || (
                        <LocalizedText vi="Chưa có địa điểm" en="Location not set" />
                      )}
                      {shoot.locationAddress ? ` · ${shoot.locationAddress}` : ""}
                    </span>
                  </p>

                  <div className="mt-3.5 max-w-md">
                    <div className="mb-1 flex justify-between text-[11px] font-black uppercase tracking-wide">
                      <span>
                        <LocalizedText vi="Checklist" en="Checklist" />{" "}
                        {checklistTotal > 0 ? `(${readinessPercent}%)` : ""}
                      </span>
                      <span>
                        {checklistTotal > 0 ? (
                          `${checklistCompleted}/${checklistTotal}`
                        ) : (
                          <span className="text-secondary/70 font-normal">
                            <LocalizedText vi="Chưa có mục nào" en="No items" />
                          </span>
                        )}
                      </span>
                    </div>
                    <ProgressBar value={readinessPercent} />
                  </div>
                </div>

                {/* Resource Metrics & Arrow Column */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 w-full text-center text-xs font-black">
                    <div
                      className={`rounded-r16 p-2.5 sm:p-3 shadow-xs transition-colors ${
                        crewConflictCount > 0
                          ? "bg-error/15 border border-error/30"
                          : "bg-white/60"
                      }`}
                    >
                      <span className="block text-lg sm:text-xl font-black leading-tight text-ink">
                        {crewCount}
                      </span>
                      <span
                        className={`text-[10px] uppercase ${
                          crewConflictCount > 0
                            ? "text-error font-extrabold"
                            : "text-secondary"
                        }`}
                      >
                        {crewConflictCount > 0 ? (
                          <LocalizedText vi="Nhân sự (!)" en="Crew (!)" />
                        ) : (
                          <LocalizedText vi="Nhân sự" en="Crew" />
                        )}
                      </span>
                    </div>
                    <div
                      className={`rounded-r16 p-2.5 sm:p-3 shadow-xs transition-colors ${
                        equipmentConflictCount > 0
                          ? "bg-error/15 border border-error/30"
                          : "bg-white/60"
                      }`}
                    >
                      <span className="block text-lg sm:text-xl font-black leading-tight text-ink">
                        {equipmentCount}
                      </span>
                      <span
                        className={`text-[10px] uppercase ${
                          equipmentConflictCount > 0
                            ? "text-error font-extrabold"
                            : "text-secondary"
                        }`}
                      >
                        {equipmentConflictCount > 0 ? (
                          <LocalizedText vi="Thiết bị (!)" en="Gear (!)" />
                        ) : (
                          <LocalizedText vi="Thiết bị" en="Gear" />
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:grid size-8 place-items-center rounded-full bg-white/80 text-ink transition-transform group-hover:translate-x-0.5 shadow-xs">
                    <ArrowRight2 size={16} variant="Linear" />
                  </div>
                </div>
              </Link>
            );
          }
        )}

        {/* Empty State */}
        {!rows.length && !error ? (
          <div className="rounded-r28 border border-dashed border-ink/20 bg-surface p-10 text-center shadow-soft">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-2xl shadow-soft">
              <Sun1 size={28} variant="Bold" className="text-pink" />
            </div>
            <p className="mt-4 text-xl font-black">
              <LocalizedText
                vi="Hôm nay chưa có lịch quay."
                en="No shoots scheduled today."
              />
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm font-medium text-secondary">
              <LocalizedText
                vi="Không có buổi quay nào được xếp lịch hôm nay. Bạn có thể tạo buổi quay mới hoặc kiểm tra toàn bộ lịch sản xuất."
                en="No productions scheduled today. Create a new shoot or check the calendar."
              />
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shoots"
                className="inline-flex rounded-pill bg-ink px-5 py-3 text-sm font-black text-white shadow-soft transition-all duration-fast hover:bg-pink active:scale-press"
              >
                <LocalizedText vi="Tạo lịch quay" en="Create shoot" />
              </Link>
              <Link
                href="/calendar"
                className="inline-flex rounded-pill border border-stroke bg-white px-5 py-3 text-sm font-black text-ink shadow-soft transition-all duration-fast hover:bg-surface active:scale-press"
              >
                <LocalizedText vi="Xem lịch" en="View calendar" />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {/* Quick Navigation Footer */}
      <footer className="mt-10 rounded-r24 sm:rounded-r28 border border-stroke/80 bg-surface/70 p-4 sm:p-5 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink">
          <LocalizedText vi="TRUY CẬP NHANH" en="QUICK NAVIGATION" />
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link
            href="/calendar"
            className="flex items-center justify-between rounded-r16 border border-stroke/70 bg-white/80 p-3 text-xs font-black text-ink shadow-soft transition-all duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
          >
            <span>
              <LocalizedText vi="Lịch sản xuất" en="Calendar" />
            </span>
            <span className="text-secondary text-sm">→</span>
          </Link>
          <Link
            href="/shoots"
            className="flex items-center justify-between rounded-r16 border border-stroke/70 bg-white/80 p-3 text-xs font-black text-ink shadow-soft transition-all duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
          >
            <span>
              <LocalizedText vi="Tất cả buổi quay" en="All Shoots" />
            </span>
            <span className="text-secondary text-sm">→</span>
          </Link>
          <Link
            href="/crew"
            className="flex items-center justify-between rounded-r16 border border-stroke/70 bg-white/80 p-3 text-xs font-black text-ink shadow-soft transition-all duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
          >
            <span>
              <LocalizedText vi="Nhân sự" en="Crew Roster" />
            </span>
            <span className="text-secondary text-sm">→</span>
          </Link>
          <Link
            href="/equipment"
            className="flex items-center justify-between rounded-r16 border border-stroke/70 bg-white/80 p-3 text-xs font-black text-ink shadow-soft transition-all duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
          >
            <span>
              <LocalizedText vi="Kho thiết bị" en="Gear Library" />
            </span>
            <span className="text-secondary text-sm">→</span>
          </Link>
        </div>
      </footer>
    </AppScreen>
  );
}
