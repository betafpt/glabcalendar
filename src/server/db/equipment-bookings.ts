import { and, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import type { Database } from "./index";
import { equipmentBookings, equipmentItems, shoots, type EquipmentBooking } from "./schema";

export type EquipmentConflict = { shootId: string; title: string; startsAt: Date; endsAt: Date };
export type EquipmentConflictRow = EquipmentConflict & { equipmentItemId: string };

export function createEquipmentBookingRepository(database: Database) {
  return {
    async listForShoot(organizationId: string, shootId: string) {
      return database
        .select({
          booking: equipmentBookings,
          equipmentItem: {
            id: equipmentItems.id,
            name: equipmentItems.name,
            assetCode: equipmentItems.assetCode,
            status: equipmentItems.status,
          },
        })
        .from(equipmentBookings)
        .innerJoin(equipmentItems, eq(equipmentBookings.equipmentItemId, equipmentItems.id))
        .where(and(eq(equipmentBookings.organizationId, organizationId), eq(equipmentBookings.shootId, shootId)));
    },
    async listForShoots(organizationId: string, shootIds: string[]) {
      if (shootIds.length === 0) return [];

      return database
        .select({ booking: equipmentBookings, equipmentItem: equipmentItems })
        .from(equipmentBookings)
        .innerJoin(equipmentItems, eq(equipmentBookings.equipmentItemId, equipmentItems.id))
        .where(
          and(
            eq(equipmentBookings.organizationId, organizationId),
            inArray(equipmentBookings.shootId, shootIds)
          )
        );
    },
    async listForEquipmentItem(organizationId: string, equipmentItemId: string) {
      return database
        .select({
          booking: equipmentBookings,
          shoot: {
            id: shoots.id,
            title: shoots.title,
            status: shoots.status,
            startsAt: shoots.startsAt,
            endsAt: shoots.endsAt,
            locationName: shoots.locationName,
          },
        })
        .from(equipmentBookings)
        .innerJoin(shoots, eq(equipmentBookings.shootId, shoots.id))
        .where(
          and(
            eq(equipmentBookings.organizationId, organizationId),
            eq(equipmentBookings.equipmentItemId, equipmentItemId)
          )
        )
        .orderBy(desc(shoots.startsAt));
    },
    async findConflicts(organizationId: string, equipmentItemId: string, targetShootId: string, startsAt: Date, endsAt: Date): Promise<EquipmentConflict[]> {
      return database.select({ shootId: shoots.id, title: shoots.title, startsAt: shoots.startsAt, endsAt: shoots.endsAt }).from(equipmentBookings).innerJoin(shoots, eq(equipmentBookings.shootId, shoots.id)).where(and(eq(equipmentBookings.organizationId, organizationId), eq(equipmentBookings.equipmentItemId, equipmentItemId), ne(shoots.id, targetShootId), ne(shoots.status, "cancelled"), lt(shoots.startsAt, endsAt), gt(shoots.endsAt, startsAt)));
    },
    async findConflictsForEquipmentItems(
      organizationId: string,
      equipmentItemIds: string[],
      targetShootId: string,
      startsAt: Date,
      endsAt: Date
    ): Promise<EquipmentConflictRow[]> {
      if (equipmentItemIds.length === 0) return [];

      return database
        .select({
          equipmentItemId: equipmentBookings.equipmentItemId,
          shootId: shoots.id,
          title: shoots.title,
          startsAt: shoots.startsAt,
          endsAt: shoots.endsAt,
        })
        .from(equipmentBookings)
        .innerJoin(shoots, eq(equipmentBookings.shootId, shoots.id))
        .where(and(
          eq(equipmentBookings.organizationId, organizationId),
          inArray(equipmentBookings.equipmentItemId, equipmentItemIds),
          ne(shoots.id, targetShootId),
          ne(shoots.status, "cancelled"),
          lt(shoots.startsAt, endsAt),
          gt(shoots.endsAt, startsAt)
        ));
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
