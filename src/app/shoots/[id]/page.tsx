import Link from "next/link";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/ui/app-screen";
import { DatabaseErrorBanner } from "@/components/ui/database-error-banner";
import { LocalizedText } from "@/components/ui/localized-text";
import { LocalizedDateTime } from "@/components/ui/localized-date-time";
import { StatusPill } from "@/components/shoots/status-pill";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { EquipmentBooking, Shoot, ShootChecklistItem, ShootCrewAssignment } from "@/server/db/schema";
import type { ShootCrewOption, ShootEquipmentOption, ShootProjectOption } from "@/server/shoot-detail-options";
import type { ShootReadinessSummary } from "@/server/services/shoot-readiness";
import { canManageShoot } from "@/server/shoot-ownership";
import { ShootChecklist } from "./shoot-checklist";
import { ShootDisclosureSections } from "./shoot-disclosure-sections";
import { WorkspaceMenu } from "@/components/production/workspace-menu";
import type { AccountAssigneeRow } from "./crew-assignment-section";
import { ShootSummaryHero } from "./shoot-summary-hero";
import { ShootGoogleSyncStatus } from "./shoot-google-sync-status";
import { ShootDeleteButton } from "./shoot-delete-button";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { isRedirectError } from "@/server/workspace-context";

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
  crewConflictCount: number;
  equipmentConflictCount: number;
  accountAssignees: AccountAssigneeRow[];
  currentUserId: string;
  currentUserRole: string;
  currentUserSystemRole: string;
  googleSyncMapped: boolean;
  error?: string;
}> {
  try {
    const [
      { db },
      { requireWorkspaceContext },
      { getCachedShootDetailData },
      { getShootDetailOptions },
      { createGoogleCalendarRepository },
      { createWorkspaceRepository },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/workspace-context"),
      import("@/server/cached-loaders"),
      import("@/server/shoot-detail-options"),
      import("@/server/db/google-calendar"),
      import("@/server/db/workspaces"),
    ]);
    const { user, organization } = await requireWorkspaceContext();

    const [detailData, { projectOptions, crewOptions: crew, equipmentOptions: equipment }, googleSync] =
      await Promise.all([
        getCachedShootDetailData(organization.id, id),
        getShootDetailOptions(organization.id),
        createGoogleCalendarRepository(db).getShootSync(organization.id, id, "google", user.id),
      ]);

    if (!detailData) {
      return {
        shoot: null,
        projects: [],
        crew: [],
        equipment: [],
        crewAssignments: [],
        equipmentBookings: [],
        checklistItems: [],
        readiness: null,
        crewConflictCount: 0,
        equipmentConflictCount: 0,
        accountAssignees: [],
        currentUserId: user.id,
        currentUserRole: "VIEWER",
        currentUserSystemRole: user.role,
        googleSyncMapped: false,
      };
    }

    const {
      shoot,
      crewAssignments,
      equipmentBookings,
      checklistItems,
      currentProject,
      accountAssignees,
      crewConflictCount,
      equipmentConflictCount,
      readiness,
    } = detailData;

    const targetMembership = await createWorkspaceRepository(db).findMembership(user.id, shoot.organizationId);

    const projects =
      currentProject && !projectOptions.some((project) => project.id === currentProject.id)
        ? [{ id: currentProject.id, name: currentProject.name }, ...projectOptions]
        : projectOptions;

    return {
      shoot,
      projects,
      crew,
      equipment,
      crewAssignments,
      equipmentBookings,
      checklistItems,
      readiness,
      crewConflictCount,
      equipmentConflictCount,
      accountAssignees,
      currentUserId: user.id,
      currentUserRole: targetMembership?.role ?? "VIEWER",
      currentUserSystemRole: user.role,
      googleSyncMapped: Boolean(googleSync?.externalEventId),
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      shoot: null,
      projects: [],
      crew: [],
      equipment: [],
      crewAssignments: [],
      equipmentBookings: [],
      checklistItems: [],
      readiness: null,
      crewConflictCount: 0,
      equipmentConflictCount: 0,
      accountAssignees: [],
      currentUserId: "",
      currentUserRole: "VIEWER",
      currentUserSystemRole: "user",
      googleSyncMapped: false,
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
  const {
    shoot,
    projects,
    crew,
    equipment,
    crewAssignments,
    equipmentBookings,
    checklistItems,
    readiness,
    crewConflictCount,
    equipmentConflictCount,
    accountAssignees,
    currentUserId,
    currentUserRole,
    currentUserSystemRole,
    googleSyncMapped,
    error,
  } = await loadData(params.id);

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

  // Normalize Date instances across cache serialization boundaries
  const normalizedShoot = {
    ...shoot,
    startsAt: shoot.startsAt instanceof Date ? shoot.startsAt : new Date(shoot.startsAt),
    endsAt: shoot.endsAt instanceof Date ? shoot.endsAt : new Date(shoot.endsAt),
    createdAt: shoot.createdAt instanceof Date ? shoot.createdAt : new Date(shoot.createdAt),
    updatedAt: shoot.updatedAt instanceof Date ? shoot.updatedAt : new Date(shoot.updatedAt),
  };

  const canManage = canManageShoot(normalizedShoot, currentUserId, currentUserRole, currentUserSystemRole);
  const project = projects.find((item) => item.id === normalizedShoot.projectId);
  const shootLocation = (normalizedShoot.locationAddress || normalizedShoot.locationName || "").trim();
  const locationLabel = normalizedShoot.locationName || normalizedShoot.locationAddress || "Chưa có địa điểm";

  const validStartsAt = isNaN(normalizedShoot.startsAt.getTime()) ? new Date() : normalizedShoot.startsAt;
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: timezone,
  }).format(validStartsAt);
  const timeLabel = new Intl.DateTimeFormat("vi-VN", {
    timeStyle: "short",
    timeZone: timezone,
  }).format(validStartsAt);

  return (
    <AppScreen className="max-w-6xl overflow-x-clip pt-5 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/shoots"
          className="grid size-11 place-items-center rounded-full bg-surface text-2xl font-bold transition duration-fast hover:bg-white active:scale-press"
        >
          ‹
          <span className="sr-only">
            <LocalizedText vi="Quay lại danh sách buổi quay" en="Back to shoots" />
          </span>
        </Link>
        <WorkspaceMenu />
      </div>

      <header className="sticky top-0 z-30 mt-3 min-w-0 border-b border-stroke/60 bg-bg/95 py-3 backdrop-blur-md">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-pink">
              <LocalizedText vi="CHI TIẾT BUỔI QUAY" en="SHOOT DETAIL" />
            </p>
            <h1 className="mt-1 max-w-full font-display text-[clamp(1.8rem,7vw,3.4rem)] font-black uppercase leading-[.9] tracking-[-.045em] [overflow-wrap:anywhere]">
              <LocalizedText vi="Chuẩn bị sản xuất" en="Production prep" />
              <span className="text-pink">*</span>
            </h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[.22em] text-secondary">
              <LocalizedText vi="Chuẩn bị & mức độ sẵn sàng" en="Shoot prep & readiness" />
            </p>
          </div>
          {canManage ? (
            <ShootDeleteButton
              shootId={shoot.id}
              shootTitle={shoot.title}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
            />
          ) : null}
        </div>
      </header>

      <ShootSummaryHero
        shootId={shoot.id}
        title={shoot.title}
        projectName={project?.name}
        status={shoot.status}
        canManage={canManage}
        locationLabel={locationLabel}
        locationHref={shootLocation ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shootLocation)}` : null}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
      />

      <ShootGoogleSyncStatus
        shootId={shoot.id}
        synced={googleSyncMapped}
        canManage={canManage}
        syncEnabledForShoot={shoot.syncPolicy === "google" && !shoot.isTestData}
      />

      {/* Main Content Area */}
      <div className="mt-6 space-y-7">
        {/* Readiness and Checklist */}
        <ShootChecklist shootId={shoot.id} items={checklistItems} crew={crew} readiness={readiness} canManage={canManage} />

        {/* Progressive Disclosure Sections: Schedule, Crew, Gear */}
        <div id="shoot-operations" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-pink">
                <LocalizedText vi="THAO TÁC SÂU & ĐIỀU PHỐI" en="OPERATIONS & DISPATCH" />
              </p>
              <h2 className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-black uppercase leading-tight tracking-tight text-ink">
                <LocalizedText vi="Chi tiết buổi quay" en="Shoot Operations" />
                <span className="text-pink">*</span>
              </h2>
            </div>
            <p className="hidden text-xs font-semibold text-secondary sm:block">
              <LocalizedText vi="Bấm vào hàng để mở/đóng chi tiết" en="Click section to expand/collapse" />
            </p>
          </div>

          <ShootDisclosureSections
            shoot={normalizedShoot}
            projects={projects}
            timezone={timezone}
            crew={crew}
            equipment={equipment}
            crewAssignments={crewAssignments}
            equipmentBookings={equipmentBookings}
            crewConflictCount={crewConflictCount}
            equipmentConflictCount={equipmentConflictCount}
            accountAssignees={accountAssignees}
            currentUserId={currentUserId}
            canManage={canManage}
          />
        </div>
      </div>
    </AppScreen>
  );
}
