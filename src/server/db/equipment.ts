import { and, asc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { equipmentItems, type EquipmentItem, type NewEquipmentItem } from "./schema";

export type CreateEquipmentItemInput = Omit<NewEquipmentItem, "id" | "createdAt" | "updatedAt">;
export type UpdateEquipmentItemInput = Partial<Omit<NewEquipmentItem, "id" | "organizationId" | "createdAt" | "updatedAt">>;

export function createEquipmentRepository(database: Database) {
  return {
    list(organizationId: string): Promise<EquipmentItem[]> {
      return database.select().from(equipmentItems).where(eq(equipmentItems.organizationId, organizationId)).orderBy(asc(equipmentItems.name));
    },
    listSummaries(organizationId: string) {
      return database
        .select({
          id: equipmentItems.id,
          name: equipmentItems.name,
          category: equipmentItems.category,
          status: equipmentItems.status,
          imageDataUrl: equipmentItems.imageDataUrl,
        })
        .from(equipmentItems)
        .where(eq(equipmentItems.organizationId, organizationId))
        .orderBy(asc(equipmentItems.name));
    },
    async findById(organizationId: string, equipmentItemId: string): Promise<EquipmentItem | null> {
      const [item] = await database.select().from(equipmentItems).where(and(eq(equipmentItems.organizationId, organizationId), eq(equipmentItems.id, equipmentItemId))).limit(1);
      return item ?? null;
    },
    async create(input: CreateEquipmentItemInput): Promise<EquipmentItem> {
      const [item] = await database.insert(equipmentItems).values(input).returning();
      if (!item) throw new Error("Failed to create equipment item.");
      return item;
    },
    async update(organizationId: string, equipmentItemId: string, input: UpdateEquipmentItemInput): Promise<EquipmentItem | null> {
      const [item] = await database.update(equipmentItems).set({ ...input, updatedAt: new Date() }).where(and(eq(equipmentItems.organizationId, organizationId), eq(equipmentItems.id, equipmentItemId))).returning();
      return item ?? null;
    },
    async remove(organizationId: string, equipmentItemId: string): Promise<boolean> {
      const deleted = await database.delete(equipmentItems).where(and(eq(equipmentItems.organizationId, organizationId), eq(equipmentItems.id, equipmentItemId))).returning({ id: equipmentItems.id });
      return deleted.length > 0;
    },
  };
}
