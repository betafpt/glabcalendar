import { and, desc, eq } from "drizzle-orm";
import type { Database } from "./index";
import {
  aiProviderCredentials,
  type AiProviderCredential,
  type NewAiProviderCredential,
} from "./schema";

export function createAiCredentialRepository(database: Database) {
  return {
    async findActive(
      ownerType: "user" | "workspace",
      ownerId: string,
      provider: string
    ): Promise<AiProviderCredential | null> {
      const [record] = await database
        .select()
        .from(aiProviderCredentials)
        .where(
          and(
            eq(aiProviderCredentials.ownerType, ownerType),
            eq(aiProviderCredentials.ownerId, ownerId),
            eq(aiProviderCredentials.provider, provider),
            eq(aiProviderCredentials.status, "active")
          )
        )
        .orderBy(desc(aiProviderCredentials.createdAt))
        .limit(1);

      return record ?? null;
    },

    async listByOwner(
      ownerType: "user" | "workspace",
      ownerId: string
    ): Promise<AiProviderCredential[]> {
      return database
        .select()
        .from(aiProviderCredentials)
        .where(
          and(
            eq(aiProviderCredentials.ownerType, ownerType),
            eq(aiProviderCredentials.ownerId, ownerId)
          )
        )
        .orderBy(desc(aiProviderCredentials.createdAt));
    },

    async create(input: NewAiProviderCredential): Promise<AiProviderCredential> {
      const [record] = await database
        .insert(aiProviderCredentials)
        .values(input)
        .returning();

      if (!record) {
        throw new Error("Failed to insert AI provider credential.");
      }

      return record;
    },

    async update(
      id: string,
      patch: Partial<NewAiProviderCredential>
    ): Promise<AiProviderCredential | null> {
      const [record] = await database
        .update(aiProviderCredentials)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(aiProviderCredentials.id, id))
        .returning();

      return record ?? null;
    },

    async revoke(id: string): Promise<boolean> {
      const [record] = await database
        .update(aiProviderCredentials)
        .set({
          status: "revoked",
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiProviderCredentials.id, id))
        .returning();

      return Boolean(record);
    },
  };
}
