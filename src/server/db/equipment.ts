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
  };
}
