import { and, asc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { shootChecklistItems, type NewShootChecklistItem, type ShootChecklistItem } from "./schema";

export function createChecklistRepository(database: Database) {
  return {
    listForShoot(organizationId: string, shootId: string): Promise<ShootChecklistItem[]> {
      return database.select().from(shootChecklistItems).where(and(eq(shootChecklistItems.organizationId, organizationId), eq(shootChecklistItems.shootId, shootId))).orderBy(asc(shootChecklistItems.sortOrder), asc(shootChecklistItems.createdAt));
    },
    async create(input: Omit<NewShootChecklistItem, "id" | "createdAt" | "updatedAt">): Promise<ShootChecklistItem> {
      const [item] = await database.insert(shootChecklistItems).values(input).returning();
      if (!item) throw new Error("Failed to create checklist item.");
      return item;
    },
    async update(organizationId: string, itemId: string, input: Partial<Omit<NewShootChecklistItem, "id" | "organizationId" | "shootId" | "createdAt" | "updatedAt">>): Promise<ShootChecklistItem | null> {
      const [item] = await database.update(shootChecklistItems).set({ ...input, updatedAt: new Date() }).where(and(eq(shootChecklistItems.organizationId, organizationId), eq(shootChecklistItems.id, itemId))).returning();
      return item ?? null;
    },
    async remove(organizationId: string, itemId: string): Promise<boolean> {
      const deleted = await database.delete(shootChecklistItems).where(and(eq(shootChecklistItems.organizationId, organizationId), eq(shootChecklistItems.id, itemId))).returning({ id: shootChecklistItems.id });
      return deleted.length > 0;
    },
  };
}
