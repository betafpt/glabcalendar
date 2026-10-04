import { desc, eq, or, sql } from "drizzle-orm";
import type { Database } from "./index";
import { aiUsages, type AiUsage, type NewAiUsage } from "./schema";

export function createAiUsageRepository(database: Database) {
  return {
    async create(input: NewAiUsage): Promise<AiUsage> {
      const [record] = await database
        .insert(aiUsages)
        .values(input)
        .returning();

      if (!record) {
        throw new Error("Failed to insert AI usage log.");
      }

      return record;
    },

    async listRecent(ownerId: string, limit: number = 20): Promise<AiUsage[]> {
      return database
        .select()
        .from(aiUsages)
        .where(or(eq(aiUsages.userId, ownerId), eq(aiUsages.workspaceId, ownerId)))
        .orderBy(desc(aiUsages.createdAt))
        .limit(limit);
    },

    async getSummary(ownerId: string): Promise<{
      totalRequests: number;
      totalTokens: number;
      totalCreditsUsed: number;
    }> {
      const [result] = await database
        .select({
          totalRequests: sql<number>`count(*)`,
          totalTokens: sql<number>`coalesce(sum(${aiUsages.totalTokens}), 0)`,
          totalCreditsUsed: sql<number>`coalesce(sum(${aiUsages.creditsUsed}), 0)`,
        })
        .from(aiUsages)
        .where(or(eq(aiUsages.userId, ownerId), eq(aiUsages.workspaceId, ownerId)));

      return {
        totalRequests: Number(result?.totalRequests ?? 0),
        totalTokens: Number(result?.totalTokens ?? 0),
        totalCreditsUsed: Number(result?.totalCreditsUsed ?? 0),
      };
    },
  };
}
