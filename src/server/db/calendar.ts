import { and, asc, eq, exists, gt, lt } from "drizzle-orm";
import type { Database } from "./index";
import { equipmentBookings, shootCrewAssignments, shoots, type Shoot } from "./schema";

export type CalendarFilters = { projectId?: string; crewMemberId?: string; equipmentItemId?: string };

export function createCalendarRepository(database: Database) {
  return {
    listRange(organizationId: string, start: Date, end: Date, filters: CalendarFilters = {}): Promise<Shoot[]> {
      const conditions = [eq(shoots.organizationId, organizationId), lt(shoots.startsAt, end), gt(shoots.endsAt, start)];
      if (filters.projectId && filters.projectId.trim()) {
        conditions.push(eq(shoots.projectId, filters.projectId.trim()));
      }
      if (filters.crewMemberId && filters.crewMemberId.trim()) {
        conditions.push(
          exists(
            database
              .select({ id: shootCrewAssignments.id })
              .from(shootCrewAssignments)
              .where(
                and(
                  eq(shootCrewAssignments.organizationId, organizationId),
                  eq(shootCrewAssignments.shootId, shoots.id),
                  eq(shootCrewAssignments.crewMemberId, filters.crewMemberId.trim())
                )
              )
          )
        );
      }
      if (filters.equipmentItemId && filters.equipmentItemId.trim()) {
        conditions.push(
          exists(
            database
              .select({ id: equipmentBookings.id })
              .from(equipmentBookings)
              .where(
                and(
                  eq(equipmentBookings.organizationId, organizationId),
                  eq(equipmentBookings.shootId, shoots.id),
                  eq(equipmentBookings.equipmentItemId, filters.equipmentItemId.trim())
                )
              )
          )
        );
      }
      return database.select().from(shoots).where(and(...conditions)).orderBy(asc(shoots.startsAt));
    },
  };
}
