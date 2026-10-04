import { and, desc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { clients, type Client, type NewClient } from "./schema";

export function createClientsRepository(database: Database) {
  return {
    async listByOrganization(organizationId: string): Promise<Client[]> {
      return database
        .select()
        .from(clients)
        .where(eq(clients.organizationId, organizationId))
        .orderBy(desc(clients.createdAt));
    },

    async findById(id: string, organizationId: string): Promise<Client | null> {
      const [client] = await database
        .select()
        .from(clients)
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
        .limit(1);
      return client ?? null;
    },

    async create(data: NewClient): Promise<Client> {
      const [client] = await database.insert(clients).values(data).returning();
      return client;
    },

    async update(
      id: string,
      organizationId: string,
      data: Partial<NewClient>
    ): Promise<Client | null> {
      const [updated] = await database
        .update(clients)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
        .returning();
      return updated ?? null;
    },

    async delete(id: string, organizationId: string): Promise<boolean> {
      const result = await database
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
        .returning({ id: clients.id });
      return result.length > 0;
    },
  };
}
