import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalizedText } from "@/components/ui/localized-text";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { StatusText } from "@/components/ui/status-text";
import { StatusChip } from "@/components/ui/status-chip";
import { Clock, Location, ArrowRight2, VideoPlay, Calendar } from "@/components/ui/iconsax";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { getInitialOrganization } from "@/server/organization-context";
import { ShootCreateForm } from "./shoot-create-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";

export const dynamic = "force-dynamic";

type ShootSummary = {
  id: string;
  projectId: string | null;
  title: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  locationName: string | null;
};

type ProjectOption = { id: string; name: string };

async function loadData(): Promise<{ shoots: ShootSummary[]; projects: ProjectOption[]; error?: string }> {
  try {
    const [{ db }, { createShootRepository }, { createProjectRepository }] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/shoots"),
      import("@/server/db/projects"),
    ]);
    const organization = await getInitialOrganization();
    const [shoots, projects] = await Promise.all([
      createShootRepository(db).listSummaries(organization.id),
      createProjectRepository(db).listOptions(organization.id),
    ]);
    return { shoots, projects };
  } catch (error) {
    return { shoots: [], projects: [], error: errorMessage(error, "Unable to load shoots right now.") };
  }
}

export default async function ShootsPage({
  searchParams,
}: {
  searchParams?: { status?: string; projectId?: string };
}) {
  const timezone = getServerConfig().appTimezone;
  const { shoots, projects, error } = await loadData();
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  const statusFilter = searchParams?.status || "all";
  const projectFilter = searchParams?.projectId;

  const filteredShoots = shoots.filter((shoot) => {
    if (projectFilter && shoot.projectId !== projectFilter) return false;
    if (statusFilter === "all") return true;
    return shoot.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const now = new Date();

  const filterTabs = [
    { id: "all", vi: "Tất cả", en: "All" },
    { id: "confirmed", vi: "Đã xác nhận", en: "Confirmed" },
    { id: "planned", vi: "Kế hoạch", en: "Planned" },
    { id: "completed", vi: "Hoàn thành", en: "Completed" },
    { id: "cancelled", vi: "Đã hủy", en: "Cancelled" },
  ];

  return (
    <AppScreen className="max-w-6xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-black uppercase tracking-[-.02em]"><LocalizedDateTime value={now.toISOString()} options={{ month: "short", year: "numeric", timeZone: timezone }} uppercase /></p>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="grid size-11 place-items-center rounded-full bg-surface text-ink shadow-soft transition hover:bg-white active:scale-press"
          >
            <Calendar size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Xem lịch" en="View calendar" /></span>
          </Link>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-4 min-w-0">
        <h1 className="max-w-full font-display text-[clamp(2.75rem,13vw,6.8rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] sm:leading-[0.92] [overflow-wrap:anywhere]">
          <LocalizedText vi="BUỔI QUAY MỚI" en="NEW SHOOT" /><span className="text-pink">*</span>
        </h1>
        <p className="mt-3 sm:mt-3.5 text-[11px] font-black uppercase tracking-[.38em] text-secondary"><LocalizedText vi="LẬP LỊCH PRODUCTION DAY" en="PLAN A PRODUCTION DAY" /></p>
      </header>

      <section className="mt-4 rounded-r24 border border-stroke bg-surface p-3 sm:p-5">
        <ShootCreateForm projects={projects} defaultProjectId={projectFilter} />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink"><LocalizedText vi="LỊCH QUAY" en="SHOOT SCHEDULE" /></p>
            <h2 className="mt-1 font-display text-[clamp(2.5rem,10vw,4.8rem)] font-black uppercase leading-[0.98] tracking-[-.05em]"><LocalizedText vi="SẮP TỚI" en="UPCOMING" /><span className="text-pink">*</span></h2>
          </div>
          <span className="rounded-pill bg-ink px-3 py-1.5 text-[10px] font-black text-white">{filteredShoots.length} <LocalizedText vi="BUỔI QUAY" en="SHOOTS" /></span>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[12px] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            const queryUrl = new URLSearchParams();
            if (tab.id !== "all") queryUrl.set("status", tab.id);
            if (projectFilter) queryUrl.set("projectId", projectFilter);
            const href = queryUrl.toString() ? `/shoots?${queryUrl.toString()}` : "/shoots";

            return (
              <Link
                key={tab.id}
                href={href}
                className={`shrink-0 rounded-pill px-4 py-2.5 text-xs font-black transition duration-fast active:scale-press ${
                  isActive
                    ? "bg-ink text-white shadow-soft"
                    : "border border-stroke/70 bg-surface text-ink shadow-soft hover:border-ink/20 hover:bg-white"
                }`}
              >
                <LocalizedText vi={tab.vi} en={tab.en} />
              </Link>
            );
          })}
        </div>

        {error ? <DatabaseErrorBanner error={error} className="mt-4" /> : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredShoots.map((shoot, index) => (
            <Link
              key={shoot.id}
              href={`/shoots/${shoot.id}`}
              className={`group rounded-r28 border border-ink/5 p-4 transition duration-base active:scale-[.99] sm:p-5 ${["bg-coral", "bg-lilac", "bg-mint", "bg-sky", "bg-yellow"][index % 5]} ${shoot.status === "completed" || shoot.endsAt.getTime() < now.getTime() ? "opacity-45 grayscale-[35%]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[.16em] text-secondary">{shoot.projectId ? projectNames.get(shoot.projectId) || "Project" : <LocalizedText vi="KHÔNG THUỘC DỰ ÁN" en="NO PROJECT" />}</p>
                  <h3 className="mt-2 font-display text-[clamp(1.9rem,8vw,3.1rem)] font-black uppercase leading-[.86] tracking-[-.04em]">{shoot.title}</h3>
                </div>
                <StatusChip tone={shoot.status === "confirmed" ? "success" : shoot.status === "cancelled" ? "error" : "neutral"}><StatusText status={shoot.status} /></StatusChip>
              </div>
              <div className="mt-5 grid gap-2 border-t border-ink/10 pt-4 text-xs font-bold text-secondary sm:grid-cols-2">
                <p className="flex items-center gap-1.5"><Clock size={14} variant="Linear" className="shrink-0 text-secondary" /> <LocalizedDateTime value={shoot.startsAt.toISOString()} options={{ dateStyle: "medium", timeStyle: "short", timeZone: timezone }} /></p>
                <p className="flex items-center gap-1.5"><Location size={14} variant="Linear" className="shrink-0 text-secondary" /> <span>{shoot.locationName || <LocalizedText vi="CHƯA CÓ ĐỊA ĐIỂM" en="LOCATION TBD" />}</span></p>
              </div>
              <div className="mt-4 flex justify-end"><span className="grid size-9 place-items-center rounded-full bg-surface/80 text-ink shadow-xs transition group-hover:translate-x-0.5"><ArrowRight2 size={16} variant="Linear" /></span></div>
            </Link>
          ))}
          {!filteredShoots.length && !error ? (
            <div className="lg:col-span-2">
              <EmptyState
                icon={<VideoPlay size={28} variant="Bold" className="text-pink" />}
                titleVi="Không tìm thấy buổi quay nào"
                titleEn="No shoots found"
                descriptionVi="Không có lịch quay nào phù hợp với bộ lọc hiện tại. Hãy chọn bộ lọc khác hoặc lên lịch cho buổi quay mới."
                descriptionEn="No production shoots match the current filter. Try a different filter or schedule a new shoot."
              />
            </div>
          ) : null}
        </div>
      </section>
    </AppScreen>
  );
}
