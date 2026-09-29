import { z } from "zod";
import type { EquipmentConflict } from "@/server/db/equipment-bookings";
import type { EquipmentBooking, Shoot } from "@/server/db/schema";

const bookingInputSchema = z.object({
  shootId: z.string().uuid(),
  equipmentItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().trim().transform((value) => value || null).nullable().optional(),
});

export interface EquipmentBookingRepositoryPort {
  findConflicts(
    organizationId: string,
    equipmentItemId: string,
    targetShootId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<EquipmentConflict[]>;
  create(input: {
    organizationId: string;
    shootId: string;
    equipmentItemId: string;
    quantity?: number;
    notes?: string | null;
  }): Promise<EquipmentBooking>;
  remove(organizationId: string, bookingId: string): Promise<boolean>;
}

export interface ShootLookupPort {
  findById(organizationId: string, shootId: string): Promise<Shoot | null>;
}

export type EquipmentBookingResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT";
        message: string;
        conflicts?: EquipmentConflict[];
      };
    };

export function createEquipmentBookingService(
  bookings: EquipmentBookingRepositoryPort,
  shoots: ShootLookupPort
) {
  return {
    async book(organizationId: string, input: unknown): Promise<EquipmentBookingResult<EquipmentBooking>> {
      const parsed = bookingInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: { code: "VALIDATION_ERROR", message: "Equipment booking data is invalid." } };
      }

      const shoot = await shoots.findById(organizationId, parsed.data.shootId);
      if (!shoot) {
        return { ok: false, error: { code: "NOT_FOUND", message: "Shoot not found." } };
      }

      const conflicts = await bookings.findConflicts(
        organizationId,
        parsed.data.equipmentItemId,
        shoot.id,
        shoot.startsAt,
        shoot.endsAt
      );

      if (conflicts.length) {
        return {
          ok: false,
          error: {
            code: "CONFLICT",
            message: "Equipment is already booked for an overlapping shoot.",
            conflicts,
          },
        };
      }

      return { ok: true, data: await bookings.create({ organizationId, ...parsed.data }) };
    },

    async remove(organizationId: string, bookingId: string): Promise<EquipmentBookingResult<null>> {
      const validId = z.string().uuid().safeParse(bookingId);
      if (!validId.success) {
        return { ok: false, error: { code: "VALIDATION_ERROR", message: "Booking id is invalid." } };
      }
      const removed = await bookings.remove(organizationId, bookingId);
      return removed
        ? { ok: true, data: null }
        : { ok: false, error: { code: "NOT_FOUND", message: "Equipment booking not found." } };
    },
  };
}
