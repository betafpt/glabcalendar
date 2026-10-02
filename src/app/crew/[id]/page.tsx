import Link from "next/link";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusText } from "@/components/ui/status-text";
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { CrewMember, Shoot, ShootCrewAssignment } from "@/server/db/schema";
import { getInitialOrganization } from "@/server/organization-context";
import { CrewForm } from "../crew-form";
import { deleteCrewAction } from "../actions";
import { WorkspaceMenu } from "@/components/production/workspace-menu";

export const dynamic = "force-dynamic";

type AssignedShoot = {
  assignment: ShootCrewAssignment;
  shoot: Shoot;
  project: {
    id: string;
    name: string;
    clientName: string | null;
    status: string;
  } | null;
};

async function load(id: string): Promise<{
  member: CrewMember | null;
  assignedShoots: AssignedShoot[];
  timezone: string;
  error?: string;
}> {
  try {
    const config = getServerConfig();
    const timezone = config.appTimezone;
    const [
      { db },
      { createCrewRepository },
      { createCrewAssignmentRepository },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/db/crew"),
      import("@/server/db/crew-assignments"),
    ]);

    const organization = await getInitialOrganization();

    const [member, assignedShoots] = await Promise.all([
      createCrewRepository(db).findById(organization.id, id),
      createCrewAssignmentRepository(db).listForCrewMember(organization.id, id),
    ]);

    return {
      member,
      assignedShoots,
      timezone: organization.timezone,
    };
  } catch (error) {
    return {
      member: null,
      assignedShoots: [],
      timezone: "Asia/Ho_Chi_Minh",
      error: errorMessage(error, "Unable to load crew member details."),
    };
  }
}

export default async function CrewDetail({ params }: { params: { id: string } }) {
  const { member, assignedShoots, timezone, error } = await load(params.id);

  if (error) {
    return (
      <AppScreen className="max-w-6xl pt-5 sm:pt-7">
        <Link
          href="/crew"
          className="inline-flex min-h-11 items-center rounded-pill bg-surface px-4 text-sm font-black text-secondary transition hover:text-ink"
        >
          ← <LocalizedText vi="Nhân sự" en="Crew" />
        </Link>
        <div className="mt-5">
          <DatabaseErrorBanner error={error} />
        </div>
      </AppScreen>
    );
  }

  if (!member) notFound();

  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // Active shoots for this crew member (excluding cancelled)
  const activeShoots = assignedShoots
    .map((a) => a.shoot)
    .filter((s) => s.status !== "cancelled");

  // Detect real schedule conflicts across active shoots
  const detectedConflicts: Array<{ shootA: Shoot; shootB: Shoot }> = [];
  for (let i = 0; i < activeShoots.length; i++) {
    for (let j = i + 1; j < activeShoots.length; j++) {
      const a = activeShoots[i];
      const b = activeShoots[j];
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        detectedConflicts.push({ shootA: a, shootB: b });
      }
    }
  }

  // Assigned unique projects
  const assignedProjects = Array.from(
    new Map(
      assignedShoots
        .map((item) => item.project)
        .filter((project): project is NonNullable<typeof project> => Boolean(project))
        .map((project) => [project.id, project])
    ).values()
  );

  return (
    <AppScreen className="max-w-6xl pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/crew"
          className="grid size-11 place-items-center rounded-full bg-surface text-xl font-black shadow-soft transition hover:bg-white active:scale-press"
        >
          ←
          <span className="sr-only"><LocalizedText vi="Quay lại danh sách nhân sự" en="Back to crew" /></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="grid size-11 place-items-center rounded-full bg-surface text-base font-bold shadow-soft transition hover:bg-white active:scale-press"
          >
            📅
            <span className="sr-only"><LocalizedText vi="Xem lịch" en="View calendar" /></span>
          </Link>
          <WorkspaceMenu />
        </div>
      </div>

      <header className="mt-3 min-w-0 overflow-hidden">
        <p className="text-[11px] font-black uppercase tracking-[.38em] text-secondary">
          <LocalizedText vi="HỒ SƠ NHÂN SỰ" en="CREW PROFILE" />
        </p>
        <h1 className="mt-2 max-w-full font-display text-[clamp(3.25rem,16.5vw,7.6rem)] font-black uppercase leading-[.78] tracking-[-.065em] sm:text-[clamp(4.2rem,12vw,7.6rem)]">
          {member.name}
          <span className="text-pink">*</span>
        </h1>
        <p className="mt-3 text-sm font-black uppercase tracking-[.14em] text-secondary">
          {member.defaultRole || <LocalizedText vi="NHÂN SỰ" en="CREW MEMBER" />}
        </p>
      </header>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,.82fr)]">
        {/* Profile Card */}
        <section className="relative min-h-[260px] overflow-hidden rounded-r22 bg-coral p-4 sm:min-h-[400px] sm:rounded-r28 sm:p-7 shadow-soft">
          <div className="absolute inset-x-0 bottom-0 top-[28%] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.72),transparent_62%)]" />
          <div className="relative flex h-full min-h-[228px] flex-col justify-between sm:min-h-[350px]">
            <div className="flex items-start justify-between gap-3">
              <span
                className={`rounded-pill px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] ${
                  member.status === "active"
                    ? "bg-success text-white shadow-xs"
                    : "bg-surface text-secondary border border-stroke"
                }`}
              >
                {member.status === "active" ? (
                  <LocalizedText vi="Đang hoạt động" en="Active" />
                ) : (
                  <LocalizedText vi="Tạm ngưng" en="Inactive" />
                )}
              </span>
              <span className="rounded-pill bg-surface/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] shadow-xs">
                {assignedShoots.length}{" "}
                <LocalizedText
                  vi="buổi quay đã nhận"
                  en={assignedShoots.length === 1 ? "shoot assigned" : "shoots assigned"}
                />
              </span>
            </div>

            <div className="mx-auto grid size-32 place-items-center overflow-hidden rounded-[28px] border border-ink/10 bg-surface/75 font-display text-4xl font-black tracking-[-.06em] shadow-soft sm:size-48 sm:rounded-full sm:text-6xl">
              {member.avatarDataUrl ? (
                <img src={member.avatarDataUrl} alt={`Avatar ${member.name}`} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold sm:text-xs">
              <div className="rounded-r16 bg-surface/85 px-3 py-2.5 sm:px-4 sm:py-3 shadow-xs">
                <span className="text-secondary font-black"><LocalizedText vi="ĐIỆN THOẠI" en="TEL" /></span>
                <p className="mt-1 break-all font-black text-ink">{member.phone || "—"}</p>
              </div>
              <div className="rounded-r16 bg-surface/85 px-3 py-2.5 sm:px-4 sm:py-3 shadow-xs">
                <span className="text-secondary font-black"><LocalizedText vi="THƯ ĐIỆN TỬ" en="EMAIL" /></span>
                <p className="mt-1 break-all font-black text-ink">{member.email || "—"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule & Conflict Status */}
        <div className="space-y-3">
          {detectedConflicts.length > 0 ? (
            <section className="rounded-r22 border border-error/30 bg-coral p-4 sm:rounded-r28 sm:p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-error">
                  ⚠ <LocalizedText vi="XUNG ĐỘT LỊCH QUAY" en="SCHEDULE CONFLICT DETECTED" />
                </p>
                <span className="rounded-pill bg-error px-2.5 py-1 text-[9px] font-black text-white">
                  {detectedConflicts.length} <LocalizedText vi="TRÙNG" en="OVERLAP" />
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-secondary">
                <LocalizedText
                  vi="Nhân sự này đang có buổi quay bị trùng khung giờ cần điều chỉnh:"
                  en="This crew member has overlapping shoot assignments requiring adjustment:"
                />
              </p>
              <div className="mt-3 space-y-2">
                {detectedConflicts.map(({ shootA, shootB }, index) => (
                  <div key={index} className="rounded-r16 bg-surface/90 p-3 shadow-xs space-y-1">
                    <p className="text-xs font-black text-ink">{shootA.title} ⚡ {shootB.title}</p>
                    <p className="text-[10px] font-bold text-secondary">
                      <LocalizedDateTime value={shootA.startsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} /> — <LocalizedDateTime value={shootA.endsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-r22 border border-mint/40 bg-mint/30 p-4 sm:rounded-r28 sm:p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#166534]">
                  ✓ <LocalizedText vi="TRẠNG THÁI LỊCH TRÌNH" en="SCHEDULE STATUS" />
                </p>
                <span className="rounded-pill bg-success px-2.5 py-1 text-[9px] font-black text-white">
                  <LocalizedText vi="RÕ RÀNG" en="CLEAR" />
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-[#166534]">
                <LocalizedText
                  vi="Tất cả các lịch phân công của nhân sự này không có xung đột thời gian."
                  en="All assignments for this crew member are clear with zero timing collisions."
                />
              </p>
            </section>
          )}

          {/* Assigned Projects */}
          <section className="rounded-r22 border border-stroke bg-surface p-4 sm:rounded-r28 sm:p-5 shadow-soft">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-secondary">
                  <LocalizedText vi="DỰ ÁN ĐÃ PHÂN CÔNG" en="ASSIGNED PROJECTS" />
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {assignedProjects.length}{" "}
                  <LocalizedText vi="DỰ ÁN" en={assignedProjects.length === 1 ? "PROJECT" : "PROJECTS"} />
                </h2>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {assignedProjects.length > 0 ? (
                assignedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-r16 bg-white/70 px-4 py-2.5 shadow-xs transition hover:bg-white active:scale-press"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-black truncate">{project.name}</p>
                      <p className="text-[10px] font-bold uppercase text-secondary">
                        {project.clientName || "G.Lab"} · <StatusText status={project.status} />
                      </p>
                    </div>
                    <span className="text-base font-bold text-secondary">›</span>
                  </Link>
                ))
              ) : (
                <p className="text-xs font-semibold text-secondary py-2">
                  <LocalizedText
                    vi="Chưa có dự án nào được gán cho nhân sự này."
                    en="No projects assigned to this crew member yet."
                  />
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Shoots Roster */}
      <section className="mt-4 rounded-r28 border border-stroke bg-surface p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink">
              <LocalizedText vi="DANH SÁCH LỊCH QUAY" en="ASSIGNED SHOOTS" />
            </p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase leading-tight tracking-[-.03em]">
              <LocalizedText vi="Lịch quay tham gia" en="Shoot Schedule" /> ({assignedShoots.length})
            </h2>
          </div>
          <Link
            href="/shoots"
            className="inline-flex min-h-9 items-center justify-center rounded-pill bg-ink px-4 text-xs font-black uppercase tracking-wider text-white shadow-soft transition hover:bg-pink active:scale-press"
          >
            + <LocalizedText vi="Gán buổi quay" en="Assign Shoot" />
          </Link>
        </div>

        <div className="mt-4 space-y-2.5">
          {assignedShoots.length > 0 ? (
            assignedShoots.map(({ assignment, shoot }) => (
              <Link
                key={assignment.id}
                href={`/shoots/${shoot.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-r20 border border-ink/8 bg-bg p-3.5 sm:p-4 transition duration-fast hover:bg-white hover:border-ink/20 active:scale-press"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base sm:text-lg font-black uppercase tracking-tight text-ink truncate">
                    {shoot.title}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-secondary">
                    ◷ <LocalizedDateTime value={shoot.startsAt.toISOString()} options={{ timeZone: timezone, dateStyle: "medium", timeStyle: "short" }} />
                    {shoot.locationName ? ` · ⌖ ${shoot.locationName}` : ""}
                    {assignment.role ? ` · ♙ ${assignment.role}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusChip
                    tone={
                      shoot.status === "confirmed"
                        ? "success"
                        : shoot.status === "cancelled"
                        ? "error"
                        : "neutral"
                    }
                  >
                    <StatusText status={shoot.status} />
                  </StatusChip>
                  <span className="grid size-8 place-items-center rounded-full bg-surface text-ink font-bold shadow-soft">
                    ›
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-r20 border border-dashed border-ink/15 p-6 text-center text-sm font-bold text-secondary">
              <LocalizedText
                vi="Chưa có buổi quay nào được gán cho nhân sự này."
                en="No shoots assigned to this crew member yet."
              />
            </div>
          )}
        </div>
      </section>

      {/* Notes & Edit Form */}
      <section className="mt-4 rounded-r28 border border-stroke bg-surface p-5 sm:p-6 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink">
          <LocalizedText vi="GHI CHÚ" en="NOTES" />
        </p>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-secondary">
          {member.notes || (
            <LocalizedText
              vi="Chưa có ghi chú cho thành viên này."
              en="No notes for this crew member yet."
            />
          )}
        </p>
        <details className="mt-5 border-t border-stroke pt-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-r12 text-sm font-black uppercase tracking-[.12em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
            <LocalizedText vi="CHỈNH SỬA HỒ SƠ +" en="EDIT PROFILE +" />
          </summary>
          <div className="mt-5 max-w-2xl">
            <CrewForm crewMember={member} />
            <div className="mt-5 border-t border-stroke pt-5">
              <DeleteEntityButton action={deleteCrewAction.bind(null, member.id)} successHref="/crew" viLabel="Xóa nhân sự" enLabel="Delete crew member" />
            </div>
          </div>
        </details>
      </section>
    </AppScreen>
  );
}
