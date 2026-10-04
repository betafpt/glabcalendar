import { and, asc, eq, exists, gt, isNull, lt, ne, notLike, or } from "drizzle-orm";
import type { Database } from "./index";
import { equipmentBookings, shootAssignees, shootCrewAssignments, shoots, type Shoot } from "./schema";

export type CalendarFilters = {
  projectId?: string;
  crewMemberId?: string;
  equipmentItemId?: string;
  includeTestData?: boolean;
};

export function createCalendarRepository(database: Database) {
  return {
    listRange(organizationId: string, start: Date, end: Date, filters: CalendarFilters = {}): Promise<Shoot[]> {
      const conditions = [eq(shoots.organizationId, organizationId), lt(shoots.startsAt, end), gt(shoots.endsAt, start)];

      // Rule 4: Event excluded hoặc test ẩn mặc định khỏi Month/Week/Timeline
      if (!filters.includeTestData) {
        const notTest = or(isNull(shoots.isTestData), eq(shoots.isTestData, false));
        if (notTest) conditions.push(notTest);
        const notExcluded = or(isNull(shoots.syncPolicy), ne(shoots.syncPolicy, "excluded"));
        if (notExcluded) conditions.push(notExcluded);
        const notLegacyGoogleBirthday = or(
          ne(shoots.syncPolicy, "google"),
          isNull(shoots.sourceCalendarId),
          notLike(shoots.sourceCalendarId, "%#contacts@group.v.calendar.google.com")
        );
        if (notLegacyGoogleBirthday) conditions.push(notLegacyGoogleBirthday);
      }
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

    listAssignedRange(userId: string, start: Date, end: Date, filters: CalendarFilters = {}): Promise<Shoot[]> {
      const conditions = [
        eq(shootAssignees.userId, userId),
        lt(shoots.startsAt, end),
        gt(shoots.endsAt, start),
      ];

      if (!filters.includeTestData) {
        const notTest = or(isNull(shoots.isTestData), eq(shoots.isTestData, false));
        if (notTest) conditions.push(notTest);
        const notExcluded = or(isNull(shoots.syncPolicy), ne(shoots.syncPolicy, "excluded"));
        if (notExcluded) conditions.push(notExcluded);
      }
      if (filters.projectId?.trim()) conditions.push(eq(shoots.projectId, filters.projectId.trim()));
      if (filters.crewMemberId?.trim()) {
        conditions.push(
          exists(
            database
              .select({ id: shootCrewAssignments.id })
              .from(shootCrewAssignments)
              .where(
                and(
                  eq(shootCrewAssignments.shootId, shoots.id),
                  eq(shootCrewAssignments.crewMemberId, filters.crewMemberId.trim())
                )
              )
          )
        );
      }
      if (filters.equipmentItemId?.trim()) {
        conditions.push(
          exists(
            database
              .select({ id: equipmentBookings.id })
              .from(equipmentBookings)
              .where(
                and(
                  eq(equipmentBookings.shootId, shoots.id),
                  eq(equipmentBookings.equipmentItemId, filters.equipmentItemId.trim())
                )
              )
          )
        );
      }

      return database
        .select({ shoot: shoots })
        .from(shootAssignees)
        .innerJoin(shoots, eq(shootAssignees.shootId, shoots.id))
        .where(and(...conditions))
        .orderBy(asc(shoots.startsAt))
        .then((rows) => rows.map((row) => row.shoot));
    },
  };
}
