import { db } from "@/server/db";
import { getServerConfig } from "@/lib/config";
import { createOrganizationRepository } from "@/server/db/organizations";
import { createShootRepository } from "@/server/db/shoots";
import { createCalendarRepository } from "@/server/db/calendar";
import { createProjectRepository } from "@/server/db/projects";
import { createCrewRepository } from "@/server/db/crew";
import { createCrewAssignmentRepository } from "@/server/db/crew-assignments";
import { createEquipmentRepository } from "@/server/db/equipment";
import { createEquipmentBookingRepository } from "@/server/db/equipment-bookings";
import { createChecklistRepository } from "@/server/db/checklists";
import { createDashboardService } from "@/server/services/dashboard";

export interface AIContext {
  organizationId: string;
  timezone: string;
  shootRepo: ReturnType<typeof createShootRepository>;
  calendarRepo: ReturnType<typeof createCalendarRepository>;
  projectRepo: ReturnType<typeof createProjectRepository>;
  crewRepo: ReturnType<typeof createCrewRepository>;
  crewAssignmentRepo: ReturnType<typeof createCrewAssignmentRepository>;
  equipmentRepo: ReturnType<typeof createEquipmentRepository>;
  equipmentBookingRepo: ReturnType<typeof createEquipmentBookingRepository>;
  checklistRepo: ReturnType<typeof createChecklistRepository>;
  dashboardService: ReturnType<typeof createDashboardService>;
}

export async function getAIContext(organizationId?: string): Promise<AIContext> {
  const config = getServerConfig();

  let orgId = organizationId;
  if (!orgId) {
    try {
      const { requireWorkspaceContext } = await import("@/server/workspace-context");
      const ctx = await requireWorkspaceContext({ allowRedirect: false });
      orgId = ctx.organization.id;
    } catch {
      const orgRepo = createOrganizationRepository(db);
      const defaultOrg = await orgRepo.getOrCreateInitial({
        name: "G.Lab Studio",
        timezone: config.appTimezone,
      });
      orgId = defaultOrg.id;
    }
  }

  const shootRepo = createShootRepository(db);
  const calendarRepo = createCalendarRepository(db);
  const projectRepo = createProjectRepository(db);
  const crewRepo = createCrewRepository(db);
  const crewAssignmentRepo = createCrewAssignmentRepository(db);
  const equipmentRepo = createEquipmentRepository(db);
  const equipmentBookingRepo = createEquipmentBookingRepository(db);
  const checklistRepo = createChecklistRepository(db);

  const dashboardService = createDashboardService({
    calendar: calendarRepo,
    projects: projectRepo,
    crewAssignments: crewAssignmentRepo,
    equipmentBookings: equipmentBookingRepo,
    checklists: checklistRepo,
  });

  return {
    organizationId: orgId,
    timezone: config.appTimezone,
    shootRepo,
    calendarRepo,
    projectRepo,
    crewRepo,
    crewAssignmentRepo,
    equipmentRepo,
    equipmentBookingRepo,
    checklistRepo,
    dashboardService,
  };
}
