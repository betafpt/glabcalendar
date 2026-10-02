import { and, desc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { shoots, type NewShoot, type Shoot } from "./schema";

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

    async listSummaries(organizationId: string) {
      return database
        .select({
          id: shoots.id,
          projectId: shoots.projectId,
          title: shoots.title,
          status: shoots.status,
          startsAt: shoots.startsAt,
          endsAt: shoots.endsAt,
          locationName: shoots.locationName,
        })
        .from(shoots)
        .where(eq(shoots.organizationId, organizationId))
        .orderBy(desc(shoots.startsAt));
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
