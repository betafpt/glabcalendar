import type { Database } from "./index";
import { createCalendarRepository } from "./calendar";
import { createChecklistRepository } from "./checklists";
import { createCrewAssignmentRepository } from "./crew-assignments";
import { createEquipmentBookingRepository } from "./equipment-bookings";

export type DashboardShoot = {
  shoot: Awaited<ReturnType<ReturnType<typeof createCalendarRepository>["listRange"]>>[number];
  crewCount: number;
  equipmentCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  conflictCount: number;
};

export function createDashboardRepository(database: Database) {
  const calendar = createCalendarRepository(database);
  const crew = createCrewAssignmentRepository(database);
  const equipment = createEquipmentBookingRepository(database);
  const checklists = createChecklistRepository(database);
  return {
    async listToday(organizationId: string, start: Date, end: Date): Promise<DashboardShoot[]> {
      const shoots = await calendar.listRange(organizationId, start, end);
      return Promise.all(shoots.map(async (shoot) => {
        const [crewRows, equipmentRows, checklistItems] = await Promise.all([
          crew.listForShoot(organizationId, shoot.id),
          equipment.listForShoot(organizationId, shoot.id),
          checklists.listForShoot(organizationId, shoot.id),
        ]);
        const conflictGroups = await Promise.all([
          ...crewRows.map(({ crewMember }) => crew.findConflicts(organizationId, crewMember.id, shoot.id, shoot.startsAt, shoot.endsAt)),
          ...equipmentRows.map(({ equipmentItem }) => equipment.findConflicts(organizationId, equipmentItem.id, shoot.id, shoot.startsAt, shoot.endsAt)),
        ]);
        return {
          shoot,
          crewCount: crewRows.length,
          equipmentCount: equipmentRows.length,
          checklistTotal: checklistItems.length,
          checklistCompleted: checklistItems.filter((item) => item.isCompleted).length,
          conflictCount: conflictGroups.reduce((sum, conflicts) => sum + conflicts.length, 0),
        };
      }));
    },
  };
}
