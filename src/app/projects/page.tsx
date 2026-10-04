import Link from "next/link";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalizedText } from "@/components/ui/localized-text";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { StatusText } from "@/components/ui/status-text";
import { Calendar, Add, VideoSquare, TickCircle, Clock, ArrowRight2, Folder2, User } from "@/components/ui/iconsax";
import { errorMessage } from "@/lib/error-message";
import type { Project } from "@/server/db/schema";
import { requireWorkspaceContext, isRedirectError } from "@/server/workspace-context";
import { ProjectCreateForm } from "./project-create-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { ModalPopover } from "@/components/ui/modal-popover";

export const dynamic = "force-dynamic";

async function loadProjects(): Promise<{
  projects: Project[];
  shootStatuses: Array<{ projectId: string | null; status: string }>;
  error?: string;
}> {
  try {
    const [
      { db },
      { createProjectRepository },
      { createShootRepository },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/projects"),
      import("@/server/db/shoots"),
    ]);

    const { organization } = await requireWorkspaceContext();

    const [projects, shootStatuses] = await Promise.all([
      createProjectRepository(db).list(organization.id),
      createShootRepository(db).listProjectStatuses(organization.id),
    ]);

    return { projects, shootStatuses };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      projects: [],
      shootStatuses: [],
      error: errorMessage(error, "Unable to load projects right now."),
    };
  }
}

const tones = ["bg-coral", "bg-lilac", "bg-mint", "bg-yellow", "bg-sky"];

function StatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase();
  if (value === "active" || value === "shooting") {
    return <LocalizedText vi="ĐANG QUAY" en="SHOOTING" />;
  }
  if (value === "completed" || value === "delivered") {
    return <LocalizedText vi="HOÀN THÀNH" en="DELIVERED" />;
  }
  if (value === "archived") {
    return <LocalizedText vi="LƯU TRỮ" en="ARCHIVED" />;
  }
  return <LocalizedText vi="TIỀN KỲ" en="PRE-PRODUCTION" />;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const { projects, shootStatuses, error } = await loadProjects();
  const currentFilter = searchParams?.status || "all";

  const filteredProjects = projects.filter((project) => {
    if (currentFilter === "all") return true;
    const s = project.status.toLowerCase();
    if (currentFilter === "pre-production") return s === "planned" || s === "pre-production";
    if (currentFilter === "shooting") return s === "active" || s === "shooting";
    if (currentFilter === "editing") return s === "editing";
    if (currentFilter === "delivered") return s === "completed" || s === "delivered";
    return true;
  });

  const now = new Date();

  return (
    <AppScreen className="max-w-5xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-black uppercase tracking-[-.02em]"><LocalizedDateTime value={now.toISOString()} options={{ month: "short", year: "numeric" }} uppercase /></p>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="grid size-11 place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition hover:border-ink/20 hover:bg-white active:scale-press"
          >
            <Calendar size={18} variant="Linear" />
            <span className="sr-only"><LocalizedText vi="Xem lịch" en="View calendar" /></span>
          </Link>
          <ModalPopover
            triggerAriaLabel="Create project"
            trigger={
              <span className="grid size-11 place-items-center rounded-full bg-ink text-white shadow-soft transition duration-fast hover:bg-pink active:scale-press select-none">
                <Add size={20} variant="Linear" />
                <span className="sr-only"><LocalizedText vi="Tạo dự án" en="Create project" /></span>
              </span>
            }
            title={<LocalizedText vi="Dự án mới" en="New project" />}
          >
            <ProjectCreateForm />
          </ModalPopover>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-3.5 sm:mt-5 min-w-0">
        <h1 className="max-w-full font-display text-[clamp(2.75rem,13vw,7.5rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] sm:leading-[0.92] [overflow-wrap:anywhere] sm:whitespace-nowrap">
          <LocalizedText vi="DỰ ÁN" en="PROJECTS" /><span className="text-pink">*</span>
        </h1>
        <p className="mt-3 sm:mt-3.5 text-[11px] font-black uppercase tracking-[.38em] text-secondary">
          <LocalizedText vi="TẤT CẢ DỰ ÁN" en="ALL PRODUCTIONS" />
        </p>
      </header>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[12px] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: "all", vi: "Tất cả", en: "All" },
          { id: "pre-production", vi: "Tiền kỳ", en: "Pre-Production" },
          { id: "shooting", vi: "Đang quay", en: "Shooting" },
          { id: "editing", vi: "Hậu kỳ", en: "Editing" },
          { id: "delivered", vi: "Bàn giao", en: "Delivered" },
        ].map((filter) => {
          const isActive = currentFilter === filter.id;
          return (
            <Link
              key={filter.id}
              href={filter.id === "all" ? "/projects" : `/projects?status=${filter.id}`}
              className={`shrink-0 rounded-pill px-4 py-2.5 text-xs font-black transition duration-fast active:scale-press ${
                isActive
                  ? "bg-ink text-white shadow-soft"
                  : "border border-stroke/70 bg-surface text-ink shadow-soft hover:border-ink/20 hover:bg-white"
              }`}
            >
              <LocalizedText vi={filter.vi} en={filter.en} />
            </Link>
          );
        })}
      </div>

      {error ? <DatabaseErrorBanner error={error} className="mt-4" /> : null}

      <section className="mt-4 space-y-3">
        {filteredProjects.map((project, index) => {
          const projectShoots = shootStatuses.filter((s) => s.projectId === project.id);
          const shootCount = projectShoots.length;
          const completedShoots = projectShoots.filter((s) => s.status === "completed").length;
          const progress =
            project.status === "completed"
              ? 100
              : shootCount > 0
              ? Math.round((completedShoots / shootCount) * 100)
              : project.status === "active"
              ? 50
              : 0;

          const tone = tones[index % tones.length];

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`group grid grid-cols-[104px_1fr] sm:grid-cols-[136px_1fr] gap-3 rounded-r22 sm:rounded-r28 border border-ink/8 p-2.5 sm:p-3.5 shadow-soft transition duration-base hover:-translate-y-0.5 hover:shadow-md hover:border-ink/15 active:scale-press ${tone}`}
            >
              <div className="relative h-full min-h-[132px] overflow-hidden rounded-r16 bg-ink/10 select-none">
                {project.coverImageUrl ? (
                  <img src={project.coverImageUrl} alt={project.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(9,9,9,0.12),transparent_42%),radial-gradient(circle_at_72%_28%,rgba(255,255,255,0.85),transparent_34%)]" />
                    <div className="absolute inset-x-[18%] bottom-[16%] top-[18%] rounded-r16 bg-ink/80 shadow-[10px_10px_0_rgba(255,255,255,0.45)] sm:shadow-[12px_12px_0_rgba(255,255,255,0.45)]" />
                    <div className="absolute inset-0 grid place-items-center font-display text-3xl sm:text-4xl font-black uppercase text-white/40">
                      GL
                    </div>
                  </>
                )}
                <div className="absolute inset-x-2 bottom-2 truncate rounded-pill bg-white/90 px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider text-ink shadow-sm backdrop-blur-xs">
                  {project.clientName || "G.Lab"}
                </div>
              </div>

              <div className="min-w-0 py-1 pr-1">
                <div className="flex items-start justify-between gap-2.5">
                  <h2 className="min-w-0 flex-1 font-display text-[clamp(1.4rem,4.8vw,2.4rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-ink break-words line-clamp-2">
                    {project.name}
                  </h2>
                  <span className="shrink-0 rounded-pill border border-ink/15 bg-white/50 backdrop-blur-xs px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-ink shadow-xs">
                    <StatusBadge status={project.status} />
                  </span>
                </div>

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-[12px] font-bold text-secondary">
                  <span className="inline-flex items-center gap-1 truncate">
                    <User size={13} variant="Linear" className="shrink-0 text-secondary/70" />
                    {project.clientName || <LocalizedText vi="Dự án nội bộ" en="Internal project" />}
                  </span>
                  {project.startsOn ? (
                    <span className="inline-flex items-center gap-1 shrink-0 text-secondary/80">
                      · <Calendar size={13} variant="Linear" className="shrink-0 text-secondary/70" />
                      {project.endsOn && project.endsOn !== project.startsOn ? `${project.startsOn} → ${project.endsOn}` : project.startsOn}
                    </span>
                  ) : null}
                </p>

                <div className="mt-3.5 sm:mt-4 grid grid-cols-3 gap-1 sm:gap-2 border-t border-ink/10 pt-2.5 sm:pt-3 text-[9px] sm:text-[10px] font-black uppercase text-secondary">
                  <span className="truncate">
                    <span className="inline-flex items-center gap-1"><VideoSquare size={12} variant="Linear" className="shrink-0" /> {shootCount}</span> <span className="font-bold"><LocalizedText vi="BUỔI QUAY" en={shootCount === 1 ? "SHOOT" : "SHOOTS"} /></span>
                  </span>
                  <span className="truncate">
                    <span className="inline-flex items-center gap-1"><TickCircle size={12} variant="Linear" className="shrink-0" /> {completedShoots}</span> <span className="font-bold"><LocalizedText vi="HOÀN TẤT" en="DONE" /></span>
                  </span>
                  <span className="truncate">
                    <span className="inline-flex items-center gap-1"><Clock size={12} variant="Linear" className="shrink-0" /> <span className="font-bold"><StatusText status={project.status} /></span></span>
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2.5">
                  <span className="text-[10px] sm:text-[11px] font-black text-ink">{progress}%</span>
                  <span className="h-2 w-14 sm:w-16 overflow-hidden rounded-pill bg-white/60 shadow-inner">
                    <span
                      className="block h-full rounded-pill bg-pink transition-[width] duration-slow"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-white/80 text-ink text-base sm:text-lg font-black shadow-soft transition group-hover:translate-x-0.5 group-hover:bg-white active:scale-press">
                    <ArrowRight2 size={16} variant="Linear" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {!filteredProjects.length && !error ? (
          <EmptyState
            icon={<Folder2 size={28} variant="Bold" className="text-pink" />}
            titleVi="Chưa có dự án"
            titleEn="No projects yet"
            descriptionVi="Không tìm thấy dự án nào phù hợp với bộ lọc hiện tại."
            descriptionEn="No projects found matching the selected filter."
          />
        ) : null}
      </section>
    </AppScreen>
  );
}
