import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  aiEntitlements,
  type AiEntitlement,
  type NewAiEntitlement,
} from "./schema";

export function createAiEntitlementRepository(database: Database) {
  return {
    async findByOwner(
      ownerType: "user" | "workspace",
      ownerId: string
    ): Promise<AiEntitlement | null> {
      const [record] = await database
        .select()
        .from(aiEntitlements)
        .where(
          and(
            eq(aiEntitlements.ownerType, ownerType),
            eq(aiEntitlements.ownerId, ownerId)
          )
        )
        .limit(1);

      return record ?? null;
    },

    async create(input: NewAiEntitlement): Promise<AiEntitlement> {
      const [record] = await database
        .insert(aiEntitlements)
        .values(input)
        .returning();

      if (!record) {
        throw new Error("Failed to insert AI entitlement.");
      }

      return record;
    },

    async update(
      id: string,
      patch: Partial<NewAiEntitlement>
    ): Promise<AiEntitlement | null> {
      const [record] = await database
        .update(aiEntitlements)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(aiEntitlements.id, id))
        .returning();

      return record ?? null;
    },

    async incrementUsedCredits(id: string, amount: number): Promise<AiEntitlement | null> {
      const [record] = await database
        .update(aiEntitlements)
        .set({
          usedCredits: sql`${aiEntitlements.usedCredits} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(aiEntitlements.id, id))
        .returning();

      return record ?? null;
    },
  };
}
