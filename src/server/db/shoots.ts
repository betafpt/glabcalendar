import { and, desc, eq, isNull, ne, notLike, or } from "drizzle-orm";
import type { Database } from "./index";
import { shootAssignees, shoots, type NewShoot, type Shoot } from "./schema";

export type CreateShootInput = Omit<
  NewShoot,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateShootInput = Partial<
  Omit<NewShoot, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

export function createShootRepository(database: Database) {
  return {
    async list(organizationId: string): Promise<Shoot[]> {
      return database
        .select()
        .from(shoots)
        .where(eq(shoots.organizationId, organizationId))
        .orderBy(desc(shoots.startsAt));
    },

    async listSummaries(organizationId: string, options: { includeTestData?: boolean } = {}) {
      const conditions = [eq(shoots.organizationId, organizationId)];

      // Mặc định ẩn các event test và excluded khỏi danh sách
      if (!options.includeTestData) {
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

      return database
        .select({
          id: shoots.id,
          projectId: shoots.projectId,
          title: shoots.title,
          status: shoots.status,
          startsAt: shoots.startsAt,
          endsAt: shoots.endsAt,
          locationName: shoots.locationName,
          syncPolicy: shoots.syncPolicy,
          isTestData: shoots.isTestData,
          sourceCalendarId: shoots.sourceCalendarId,
          externalEventId: shoots.externalEventId,
        })
        .from(shoots)
        .where(and(...conditions))
        .orderBy(desc(shoots.startsAt));
    },

    async listAssignedSummaries(userId: string, options: { includeTestData?: boolean } = {}) {
      const conditions = [eq(shootAssignees.userId, userId)];
      if (!options.includeTestData) {
        const notTest = or(isNull(shoots.isTestData), eq(shoots.isTestData, false));
        if (notTest) conditions.push(notTest);
        const notExcluded = or(isNull(shoots.syncPolicy), ne(shoots.syncPolicy, "excluded"));
        if (notExcluded) conditions.push(notExcluded);
      }

      return database
        .select({
          id: shoots.id,
          projectId: shoots.projectId,
          title: shoots.title,
          status: shoots.status,
          startsAt: shoots.startsAt,
          endsAt: shoots.endsAt,
          locationName: shoots.locationName,
          syncPolicy: shoots.syncPolicy,
          isTestData: shoots.isTestData,
          sourceCalendarId: shoots.sourceCalendarId,
          externalEventId: shoots.externalEventId,
        })
        .from(shootAssignees)
        .innerJoin(shoots, eq(shootAssignees.shootId, shoots.id))
        .where(and(...conditions))
        .orderBy(desc(shoots.startsAt));
    },

    async findAccessibleById(organizationId: string, shootId: string, userId: string) {
      const [row] = await database
        .select({ shoot: shoots })
        .from(shoots)
        .leftJoin(
          shootAssignees,
          and(eq(shootAssignees.shootId, shoots.id), eq(shootAssignees.userId, userId))
        )
        .where(
          and(
            eq(shoots.id, shootId),
            or(eq(shoots.organizationId, organizationId), eq(shootAssignees.userId, userId))
          )
        )
        .limit(1);
      return row?.shoot ?? null;
    },

    async findById(
      organizationId: string,
      shootId: string
    ): Promise<Shoot | null> {
      const [shoot] = await database
        .select()
        .from(shoots)
        .where(
          and(
            eq(shoots.organizationId, organizationId),
            eq(shoots.id, shootId)
          )
        )
        .limit(1);
      return shoot ?? null;
    },

    async listForProject(organizationId: string, projectId: string) {
      return database
        .select({
          id: shoots.id,
          title: shoots.title,
          status: shoots.status,
          startsAt: shoots.startsAt,
          locationName: shoots.locationName,
        })
        .from(shoots)
        .where(
          and(
            eq(shoots.organizationId, organizationId),
            eq(shoots.projectId, projectId)
          )
        )
        .orderBy(desc(shoots.startsAt));
    },

    async listProjectStatuses(organizationId: string) {
      return database
        .select({ projectId: shoots.projectId, status: shoots.status })
        .from(shoots)
        .where(eq(shoots.organizationId, organizationId));
    },

    async create(input: CreateShootInput): Promise<Shoot> {
      const [shoot] = await database.insert(shoots).values(input).returning();
      if (!shoot) throw new Error("Failed to create shoot.");
      return shoot;
    },

    async update(
      organizationId: string,
      shootId: string,
      input: UpdateShootInput
    ): Promise<Shoot | null> {
      const [shoot] = await database
        .update(shoots)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(
            eq(shoots.organizationId, organizationId),
            eq(shoots.id, shootId)
          )
        )
        .returning();
      return shoot ?? null;
    },
    async remove(organizationId: string, shootId: string): Promise<boolean> {
      const deleted = await database.delete(shoots).where(and(eq(shoots.organizationId, organizationId), eq(shoots.id, shootId))).returning({ id: shoots.id });
      return deleted.length > 0;
    },
  };
}
