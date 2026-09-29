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
  };
}

