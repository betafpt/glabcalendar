import type { Database } from "./index";
import { createCalendarRepository } from "./calendar";
import { createChecklistRepository } from "./checklists";
import { createCrewAssignmentRepository } from "./crew-assignments";
import { createEquipmentBookingRepository } from "./equipment-bookings";
import { createProjectRepository } from "./projects";
import {
  calculateDashboardReadiness,
  createDashboardService,
  type DashboardReadinessSummary,
  type DashboardShoot,
  type TodayDashboardQueryOptions,
  type TodayDashboardSummary,
} from "@/server/services/dashboard";

export { calculateDashboardReadiness };
export type {
  DashboardReadinessSummary,
  DashboardShoot,
  TodayDashboardQueryOptions,
  TodayDashboardSummary,
};

export function createDashboardRepository(database: Database) {
  const service = createDashboardService({
    calendar: createCalendarRepository(database),
    projects: createProjectRepository(database),
    crewAssignments: createCrewAssignmentRepository(database),
    equipmentBookings: createEquipmentBookingRepository(database),
    checklists: createChecklistRepository(database),
  });

  return {
    async listToday(
      organizationId: string,
      startOrTimezoneOrOptions?: Date | string | TodayDashboardQueryOptions,
      maybeEndOrAnchor?: Date
    ): Promise<DashboardShoot[]> {
      return service.listToday(
        organizationId,
        startOrTimezoneOrOptions,
        maybeEndOrAnchor
      );
    },
    async listRange(
      organizationId: string,
      start: Date,
      end: Date
    ): Promise<DashboardShoot[]> {
      return service.listRange(organizationId, start, end);
    },
    async getToday(
      organizationId: string,
      options?: TodayDashboardQueryOptions | string,
      anchor?: Date
    ): Promise<TodayDashboardSummary> {
      return service.getToday(organizationId, options, anchor);
    },
  };
}
