import { and, eq, gt, lt, ne } from "drizzle-orm";
import type { Database } from "./index";
import { equipmentBookings, equipmentItems, shoots, type EquipmentBooking } from "./schema";

export type EquipmentConflict = { shootId: string; title: string; startsAt: Date; endsAt: Date };

export function createEquipmentBookingRepository(database: Database) {
  return {
    async listForShoot(organizationId: string, shootId: string) {
      return database.select({ booking: equipmentBookings, equipmentItem: equipmentItems }).from(equipmentBookings).innerJoin(equipmentItems, eq(equipmentBookings.equipmentItemId, equipmentItems.id)).where(and(eq(equipmentBookings.organizationId, organizationId), eq(equipmentBookings.shootId, shootId)));
    },
    async findConflicts(organizationId: string, equipmentItemId: string, targetShootId: string, startsAt: Date, endsAt: Date): Promise<EquipmentConflict[]> {
      return database.select({ shootId: shoots.id, title: shoots.title, startsAt: shoots.startsAt, endsAt: shoots.endsAt }).from(equipmentBookings).innerJoin(shoots, eq(equipmentBookings.shootId, shoots.id)).where(and(eq(equipmentBookings.organizationId, organizationId), eq(equipmentBookings.equipmentItemId, equipmentItemId), ne(shoots.id, targetShootId), ne(shoots.status, "cancelled"), lt(shoots.startsAt, endsAt), gt(shoots.endsAt, startsAt)));
    },
    async create(input: { organizationId: string; shootId: string; equipmentItemId: string; quantity?: number; notes?: string | null }): Promise<EquipmentBooking> {
      const [booking] = await database.insert(equipmentBookings).values(input).returning();
      if (!booking) throw new Error("Failed to book equipment.");
      return booking;
    },
    async remove(organizationId: string, bookingId: string): Promise<boolean> {
      const deleted = await database.delete(equipmentBookings).where(and(eq(equipmentBookings.organizationId, organizationId), eq(equipmentBookings.id, bookingId))).returning({ id: equipmentBookings.id });
      return deleted.length > 0;
    },
  };
}
