import Link from "next/link";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusText } from "@/components/ui/status-text";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { Project } from "@/server/db/schema";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { ProjectEditForm } from "./project-edit-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { deleteProjectAction } from "../actions";

export const dynamic = "force-dynamic";

type ProjectShoot = {
  id: string;
  title: string;
  status: string;
  startsAt: Date;
  locationName: string | null;
};

async function loadProject(id: string): Promise<{ project: Project | null; shoots: ProjectShoot[]; error?: string }> {
  try {
    const [{ db }, { createProjectRepository }, { createShootRepository }] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/projects"),
      import("@/server/db/shoots"),
    ]);
    const { organization } = await requireWorkspaceContext();
    const [project, shoots] = await Promise.all([
      createProjectRepository(db).findById(organization.id, id),
      createShootRepository(db).listForProject(organization.id, id),
    ]);
    return { project, shoots };
  } catch (error) {
    return { project: null, shoots: [], error: errorMessage(error, "Unable to load project right now.") };
  }
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const timezone = getServerConfig().appTimezone;
  const { project, shoots, error } = await loadProject(params.id);

  if (error) {
    return (
      <AppScreen className="pt-5 sm:pt-7">
        <div className="flex items-center justify-between gap-3">
          <Link href="/projects" className="inline-flex min-h-11 items-center rounded-pill bg-surface px-4 text-sm font-black text-secondary transition hover:text-ink">
            ← <LocalizedText vi="Dự án" en="Projects" />
          </Link>
          <WorkspaceMenu />
        </div>
        <div className="mt-5">
          <DatabaseErrorBanner error={error} />
        </div>
      </AppScreen>
    );
  }

  if (!project) notFound();

  return (
    <AppScreen>
      <div className="flex items-center justify-between gap-3">
        <Link href="/projects" className="inline-flex min-h-11 items-center rounded-pill bg-surface px-4 text-sm font-black text-secondary transition hover:text-ink">
        ← <LocalizedText vi="Dự án" en="Projects" />
      </Link>
        <WorkspaceMenu />
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <div className="space-y-6">
          <section className="rounded-r28 border border-stroke bg-lilac p-6 sm:p-8">
            {project.coverImageUrl ? (
              <div className="mb-6 overflow-hidden rounded-r22 border border-ink/10 aspect-[2.4] max-h-64 w-full bg-ink/10 shadow-soft">
                <img src={project.coverImageUrl} alt={project.name} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[.16em] text-secondary"><LocalizedText vi="Dự án" en="Project" /></p>
                <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.55rem,14vw,6.8rem)] font-black uppercase leading-[.82] tracking-[-.05em] [overflow-wrap:anywhere] sm:text-[clamp(3rem,9vw,6.8rem)]">{project.name}<span className="text-pink">*</span></h1>
              </div>
              <StatusChip tone={project.status === "active" ? "success" : project.status === "completed" ? "mint" : "neutral"}><StatusText status={project.status} /></StatusChip>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-r22 bg-surface/80 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-secondary"><LocalizedText vi="Khách hàng" en="Client" /></p><p className="mt-2 text-lg font-black">{project.clientName || "—"}</p></div>
              <div className="rounded-r22 bg-surface/80 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-secondary"><LocalizedText vi="Bắt đầu" en="Start" /></p><p className="mt-2 text-lg font-black">{project.startsOn || "—"}</p></div>
              <div className="rounded-r22 bg-surface/80 p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-secondary"><LocalizedText vi="Kết thúc" en="End" /></p><p className="mt-2 text-lg font-black">{project.endsOn || "—"}</p></div>
            </div>
            {project.notes ? <p className="mt-6 max-w-3xl text-sm font-semibold leading-6 text-secondary">{project.notes}</p> : null}
          </section>

          {/* Shoots section under project */}
          <section className="rounded-r28 border border-stroke bg-surface p-6 sm:p-8 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink">
                  <LocalizedText vi="LỊCH QUAY" en="SHOOTS" />
                </p>
                <h2 className="mt-1 font-display text-2xl font-black uppercase leading-tight tracking-[-.03em]">
                  <LocalizedText vi="Buổi quay của dự án" en="Project Shoots" /> ({shoots.length})
                </h2>
              </div>
              <Link
                href={`/shoots?projectId=${project.id}`}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white shadow-soft transition duration-fast hover:bg-pink active:scale-press"
              >
                + <LocalizedText vi="Thêm lịch quay" en="Add shoot" />
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {shoots.map((shoot) => (
                <Link
                  key={shoot.id}
                  href={`/shoots/${shoot.id}`}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-r22 border border-ink/8 bg-bg p-4 transition duration-fast hover:border-ink/20 hover:bg-white active:scale-press"
                >
                  <div className="min-w-0">
                    <p className="font-display text-lg font-black uppercase leading-tight tracking-[-.02em] text-ink truncate">
                      {shoot.title}
                    </p>
                    <p className="mt-1 break-words text-xs font-bold text-secondary">
                      ◷ {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(shoot.startsAt)}
                      {shoot.locationName ? ` · ⌖ ${shoot.locationName}` : ""}
                    </p>
                  </div>
                  <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                    <StatusChip tone={shoot.status === "confirmed" ? "success" : shoot.status === "cancelled" ? "error" : "neutral"}>
                      <StatusText status={shoot.status} />
                    </StatusChip>
                    <span className="grid size-8 place-items-center rounded-full bg-surface text-ink font-bold shadow-soft">
                      ›
                    </span>
                  </div>
                </Link>
              ))}
              {!shoots.length ? (
                <div className="rounded-r22 border border-dashed border-ink/15 p-6 text-center text-sm font-bold text-secondary">
                  <LocalizedText
                    vi="Chưa có buổi quay nào cho dự án này. Bấm nút bên trên để tạo lịch quay."
                    en="No shoots scheduled for this project yet. Tap the button above to add one."
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="h-fit rounded-r28 border border-stroke bg-surface p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[.16em] text-pink"><LocalizedText vi="Chỉnh sửa" en="Edit" /></p>
          <h2 className="mt-2 text-2xl font-black"><LocalizedText vi="Thông tin dự án" en="Project details" /></h2>
          <div className="mt-5"><ProjectEditForm project={project} /></div>
          <div className="mt-5 border-t border-stroke pt-5">
            <DeleteEntityButton action={deleteProjectAction.bind(null, project.id)} successHref="/projects" viLabel="Xóa dự án" enLabel="Delete project" viConfirm="Bạn có chắc muốn xóa dự án này? Các buổi quay vẫn được giữ lại nhưng sẽ không còn thuộc dự án." enConfirm="Delete this project? Its shoots will remain but will no longer belong to the project." />
          </div>
        </section>
      </div>
    </AppScreen>
  );
}
