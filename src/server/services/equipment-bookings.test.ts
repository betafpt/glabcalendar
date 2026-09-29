import { describe, expect, it, vi } from "vitest";
import { createEquipmentBookingService } from "./equipment-bookings";

const organizationId = "11111111-1111-4111-8111-111111111111";
const shootId = "22222222-2222-4222-8222-222222222222";
const equipmentItemId = "33333333-3333-4333-8333-333333333333";

const shoot = {
  id: shootId,
  organizationId,
  projectId: null,
  title: "Commercial",
  status: "confirmed",
  startsAt: new Date("2026-10-01T09:00:00Z"),
  endsAt: new Date("2026-10-01T11:00:00Z"),
  callTime: null,
  locationName: null,
  locationAddress: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("equipment booking service", () => {
  it("returns typed conflict details and does not create an overlapping booking", async () => {
    const create = vi.fn();
    const conflicts = [{ shootId: "44444444-4444-4444-8444-444444444444", title: "Portrait", startsAt: new Date("2026-10-01T10:00:00Z"), endsAt: new Date("2026-10-01T12:00:00Z") }];
    const service = createEquipmentBookingService(
      { findConflicts: vi.fn().mockResolvedValue(conflicts), create, remove: vi.fn() },
      { findById: vi.fn().mockResolvedValue(shoot) }
    );

    const result = await service.book(organizationId, { shootId, equipmentItemId, quantity: 1 });

    expect(result).toEqual({ ok: false, error: { code: "CONFLICT", message: expect.any(String), conflicts } });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the booking when the conflict query is empty", async () => {
    const booking = { id: "55555555-5555-4555-8555-555555555555", organizationId, shootId, equipmentItemId, quantity: 1, notes: null, createdAt: new Date() };
    const create = vi.fn().mockResolvedValue(booking);
    const service = createEquipmentBookingService(
      { findConflicts: vi.fn().mockResolvedValue([]), create, remove: vi.fn() },
      { findById: vi.fn().mockResolvedValue(shoot) }
    );

    const result = await service.book(organizationId, { shootId, equipmentItemId, quantity: 1 });

    expect(result).toEqual({ ok: true, data: booking });
    expect(create).toHaveBeenCalledOnce();
  });
});
