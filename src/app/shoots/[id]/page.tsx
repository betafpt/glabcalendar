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
import type { EquipmentBooking, Shoot, ShootChecklistItem, ShootCrewAssignment } from "@/server/db/schema";
import type { ShootCrewOption, ShootEquipmentOption, ShootProjectOption } from "@/server/shoot-detail-options";
import type { ShootReadinessSummary } from "@/server/services/shoot-readiness";
import { ResourceScheduling } from "./resource-scheduling";
import { ShootChecklist } from "./shoot-checklist";
import { ShootEditForm } from "./shoot-edit-form";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import { deleteShootAction } from "../actions";

export const dynamic = "force-dynamic";

type CrewRow = { assignment: ShootCrewAssignment; crewMember: ShootCrewOption };
type EquipmentRow = { booking: EquipmentBooking; equipmentItem: ShootEquipmentOption };

async function loadData(id: string): Promise<{
  shoot: Shoot | null;
  projects: ShootProjectOption[];
  crew: ShootCrewOption[];
  equipment: ShootEquipmentOption[];
  crewAssignments: CrewRow[];
  equipmentBookings: EquipmentRow[];
  checklistItems: ShootChecklistItem[];
  readiness: ShootReadinessSummary | null;
  error?: string;
}> {
  try {
    const [
      { db },
    { createShootRepository },
    { createProjectRepository },
    { createCrewAssignmentRepository },
    { createEquipmentBookingRepository },
    { createChecklistRepository },
    { calculateShootReadiness },
    { getInitialOrganization },
    { getShootDetailOptions },
  ] = await Promise.all([
    import("@/server/db"),
    import("@/server/db/shoots"),
    import("@/server/db/projects"),
    import("@/server/db/crew-assignments"),
    import("@/server/db/equipment-bookings"),
    import("@/server/db/checklists"),
    import("@/server/services/shoot-readiness"),
    import("@/server/organization-context"),
    import("@/server/shoot-detail-options"),
  ]);
  const organization = await getInitialOrganization();
  const shootRepo = createShootRepository(db);
  const shoot = await shootRepo.findById(organization.id, id);
  if (!shoot) {
    return {
      shoot: null,
      projects: [],
      crew: [],
      equipment: [],
      crewAssignments: [],
      equipmentBookings: [],
      checklistItems: [],
      readiness: null,
    };
  }

  const crewAssignmentRepo = createCrewAssignmentRepository(db);
  const equipmentBookingRepo = createEquipmentBookingRepository(db);
  const projectRepo = createProjectRepository(db);

  const [{ projectOptions, crewOptions: crew, equipmentOptions: equipment }, crewAssignments, equipmentBookings, checklistItems, currentProject] =
    await Promise.all([
      getShootDetailOptions(organization.id),
      crewAssignmentRepo.listForShoot(organization.id, id),
      equipmentBookingRepo.listForShoot(organization.id, id),
      createChecklistRepository(db).listForShoot(organization.id, id),
      shoot.projectId ? projectRepo.findById(organization.id, shoot.projectId) : Promise.resolve(null),
    ]);

  const projects =
    currentProject && !projectOptions.some((project) => project.id === currentProject.id)
      ? [{ id: currentProject.id, name: currentProject.name }, ...projectOptions]
      : projectOptions;

  const isCancelled = shoot.status === "cancelled";

  const [crewConflictGroups, equipmentConflictGroups] = isCancelled
    ? [
        crewAssignments.map(({ crewMember }) => ({ crewMember, conflicts: [] })),
        equipmentBookings.map(({ equipmentItem }) => ({ equipmentItem, conflicts: [] })),
      ]
    : await Promise.all([
        crewAssignmentRepo
          .findConflictsForCrewMembers(
            organization.id,
            crewAssignments.map(({ crewMember }) => crewMember.id),
            shoot.id,
            shoot.startsAt,
            shoot.endsAt
          )
          .then((rows) => crewAssignments.map(({ crewMember }) => ({
            crewMember,
            conflicts: rows
              .filter((row) => row.crewMemberId === crewMember.id)
              .map(({ crewMemberId: _crewMemberId, ...conflict }) => conflict),
          }))),
        equipmentBookingRepo
          .findConflictsForEquipmentItems(
            organization.id,
            equipmentBookings.map(({ equipmentItem }) => equipmentItem.id),
            shoot.id,
            shoot.startsAt,
            shoot.endsAt
          )
          .then((rows) => equipmentBookings.map(({ equipmentItem }) => ({
            equipmentItem,
            conflicts: rows
              .filter((row) => row.equipmentItemId === equipmentItem.id)
              .map(({ equipmentItemId: _equipmentItemId, ...conflict }) => conflict),
          }))),
      ]);

  const readiness = calculateShootReadiness({
    shoot,
    checklistItems,
    crewAssignments: crewConflictGroups,
    equipmentBookings: equipmentConflictGroups,
  });

  return {
    shoot,
    projects,
    crew,
    equipment,
    crewAssignments,
    equipmentBookings,
    checklistItems,
    readiness,
  };
  } catch (error) {
    return {
      shoot: null,
      projects: [],
      crew: [],
      equipment: [],
      crewAssignments: [],
      equipmentBookings: [],
      checklistItems: [],
      readiness: null,
      error: errorMessage(error, "Unable to load shoot details right now."),
    };
  }
}

function statusTone(status: Shoot["status"]): "success" | "warning" | "error" | "neutral" {
  if (status === "completed" || status === "confirmed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "cancelled") return "error";
  return "neutral";
}

export default async function ShootDetailPage({ params }: { params: { id: string } }) {
  const timezone = getServerConfig().appTimezone;
  const { shoot, projects, crew, equipment, crewAssignments, equipmentBookings, checklistItems, readiness, error } = await loadData(params.id);

  if (error) {
    return (
      <AppScreen className="max-w-6xl pt-5 sm:pt-7">
        <Link
          href="/shoots"
          className="inline-flex min-h-11 items-center rounded-pill bg-surface px-4 text-sm font-black text-secondary transition hover:text-ink"
        >
          ← <LocalizedText vi="Buổi quay" en="Shoots" />
        </Link>
        <div className="mt-5">
          <DatabaseErrorBanner error={error} />
        </div>
      </AppScreen>
    );
  }

  if (!shoot) notFound();
  const project = projects.find((item) => item.id === shoot.projectId);

  return (
    <AppScreen className="max-w-6xl overflow-x-clip pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/shoots"
          className="grid size-11 place-items-center rounded-full bg-surface text-2xl font-bold transition duration-fast hover:bg-white active:scale-press"
        >
          ‹
          <span className="sr-only"><LocalizedText vi="Quay lại danh sách buổi quay" en="Back to shoots" /></span>
        </Link>
        <WorkspaceMenu />
      </div>

      <header className="mt-3 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="max-w-full font-display text-[clamp(2.42rem,12.2vw,7.4rem)] font-black uppercase leading-[.78] tracking-[-.065em] [overflow-wrap:anywhere] sm:whitespace-nowrap sm:text-[clamp(4rem,11vw,7.4rem)]">
              <LocalizedText vi="DANH SÁCH" en="CHECKLIST" /><span className="text-pink">*</span>
            </h1>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[.38em] text-secondary">
              <LocalizedText vi="Chuẩn bị & mức độ sẵn sàng" en="Shoot prep & readiness" />
            </p>
          </div>
          <p className="hidden max-w-[150px] text-[10px] font-black uppercase leading-4 tracking-[.12em] text-secondary sm:block">
            <LocalizedText vi="Chuẩn bị kỹ. Gọn gàng. Quay tốt hơn." en="Be prepared. Stay organized. Shoot better." />
          </p>
        </div>
      </header>

      <section className="relative mt-4 rounded-r28 border border-ink/5 bg-coral p-4 sm:p-5 shadow-soft">
        <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[112px_1fr_auto] sm:items-center sm:gap-4">
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-r22 bg-pink/30 text-[1.8rem] font-display font-black tracking-[-.08em] text-ink/70 sm:text-4xl">
            <span className="absolute inset-x-3 top-3 h-px bg-ink/10" />
            <span className="absolute inset-y-3 left-3 w-px bg-ink/10" />
            <span>GL</span>
            <span className="absolute bottom-2.5 right-2.5 text-base text-pink">*</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[.18em] text-secondary">
              {project ? project.name : <LocalizedText vi="KHÔNG THUỘC DỰ ÁN" en="NO PROJECT" />}
            </p>
            <div className="mt-1 min-w-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
              <h2 className="min-w-0 pr-10 font-display text-[clamp(1.28rem,6vw,2.5rem)] font-black uppercase leading-[.88] tracking-[-.04em] sm:flex-1 sm:truncate sm:pr-0">
                {shoot.title}
              </h2>
              <div className="mt-2 sm:mt-0">
                <StatusChip tone={statusTone(shoot.status)}><StatusText status={shoot.status} /></StatusChip>
              </div>
            </div>
            <div className="mt-2.5 grid gap-1 text-[11px] font-bold leading-4 text-secondary sm:grid-cols-3 sm:gap-2 sm:text-xs">
              <p className="truncate">⌖ {shoot.locationName || <LocalizedText vi="Chưa có địa điểm" en="Location TBD" />}</p>
              <p>▣ <LocalizedDateTime value={shoot.startsAt.toISOString()} options={{ dateStyle: "medium", timeZone: timezone }} /></p>
              <p>◷ {shoot.callTime ? new Intl.DateTimeFormat("vi-VN", { timeStyle: "short", timeZone: timezone }).format(shoot.callTime) : new Intl.DateTimeFormat("vi-VN", { timeStyle: "short", timeZone: timezone }).format(shoot.startsAt)} <span className="text-[10px] font-black uppercase tracking-[.08em]"><LocalizedText vi="(Giờ tập trung)" en="(Call Time)" /></span></p>
            </div>
          </div>
          <a
            href="#edit-shoot"
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-surface/90 text-xl font-bold transition hover:bg-white active:scale-press sm:static"
          >
            ›
            <span className="sr-only"><LocalizedText vi="Chỉnh sửa buổi quay" en="Edit shoot" /></span>
          </a>
        </div>
      </section>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,.8fr)]">
        <div className="space-y-6">
          <ShootChecklist shootId={shoot.id} items={checklistItems} crew={crew} readiness={readiness} />
          <ResourceScheduling shootId={shoot.id} crew={crew} equipment={equipment} crewAssignments={crewAssignments} equipmentBookings={equipmentBookings} />
        </div>
        <aside>
          <section id="edit-shoot" className="sticky top-6 h-fit rounded-r28 border border-stroke bg-surface p-5 sm:p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink">
                <LocalizedText vi="CHI TIẾT" en="DETAILS" />
              </p>
              <span className="rounded-pill bg-ink/5 px-2.5 py-1 text-[10px] font-black uppercase text-secondary">
                <LocalizedText vi="CHỈNH SỬA" en="EDIT" />
              </span>
            </div>
            <h2 className="mt-1 font-display text-[clamp(1.7rem,4vw,2.3rem)] font-black uppercase leading-[.88] tracking-[-.04em]">
              <LocalizedText vi="Cập nhật lịch quay" en="Update shoot" /><span className="text-pink">*</span>
            </h2>
            <div className="mt-5">
              <ShootEditForm shoot={shoot} projects={projects} timezone={timezone} />
              <div className="mt-5 border-t border-stroke pt-5">
                <DeleteEntityButton action={deleteShootAction.bind(null, shoot.id)} successHref="/shoots" viLabel="Xóa buổi quay" enLabel="Delete shoot" />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </AppScreen>
  );
}
