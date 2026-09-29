import { describe, expect, it, vi } from "vitest";
import { createChecklistService } from "./checklists";
import { createCrewAssignmentService } from "./crew-assignments";
import { createEquipmentBookingService } from "./equipment-bookings";

const organizationId = "11111111-1111-4111-8111-111111111111";
const shootId = "22222222-2222-4222-8222-222222222222";

const shoot = {
  id: shootId,
  organizationId,
  projectId: null,
  title: "Campaign day",
  status: "confirmed",
  startsAt: new Date("2026-10-01T09:00:00Z"),
  endsAt: new Date("2026-10-01T11:00:00Z"),
  callTime: null,
  locationName: null,
  locationAddress: null,
  notes: null,
  createdAt: new Date("2026-09-20T00:00:00Z"),
  updatedAt: new Date("2026-09-20T00:00:00Z"),
};

describe("critical scheduling workflows", () => {
  it("checks crew and equipment against the target shoot window before creating reservations", async () => {
    const crewMemberId = "33333333-3333-4333-8333-333333333333";
    const equipmentItemId = "44444444-4444-4444-8444-444444444444";
    const findCrewConflicts = vi.fn().mockResolvedValue([]);
    const findEquipmentConflicts = vi.fn().mockResolvedValue([]);
    const createCrew = vi.fn().mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      organizationId,
      shootId,
      crewMemberId,
      role: "DP",
      notes: null,
      createdAt: new Date(),
    });
    const createEquipment = vi.fn().mockResolvedValue({
      id: "66666666-6666-4666-8666-666666666666",
      organizationId,
      shootId,
      equipmentItemId,
      quantity: 1,
      notes: null,
      createdAt: new Date(),
    });
    const shootLookup = { findById: vi.fn().mockResolvedValue(shoot) };

    const crewService = createCrewAssignmentService(
      { findConflicts: findCrewConflicts, create: createCrew, remove: vi.fn() },
      shootLookup
    );
    const equipmentService = createEquipmentBookingService(
      { findConflicts: findEquipmentConflicts, create: createEquipment, remove: vi.fn() },
      shootLookup
    );

    const [crewResult, equipmentResult] = await Promise.all([
      crewService.assign(organizationId, { shootId, crewMemberId, role: "DP" }),
      equipmentService.book(organizationId, { shootId, equipmentItemId, quantity: 1 }),
    ]);

    expect(crewResult.ok).toBe(true);
    expect(equipmentResult.ok).toBe(true);
    expect(findCrewConflicts).toHaveBeenCalledWith(
      organizationId,
      crewMemberId,
      shootId,
      shoot.startsAt,
      shoot.endsAt
    );
    expect(findEquipmentConflicts).toHaveBeenCalledWith(
      organizationId,
      equipmentItemId,
      shootId,
      shoot.startsAt,
      shoot.endsAt
    );
    expect(createCrew).toHaveBeenCalledOnce();
    expect(createEquipment).toHaveBeenCalledOnce();
  });

  it("runs checklist create, complete, reopen, and remove through one repository lifecycle", async () => {
    const itemId = "77777777-7777-4777-8777-777777777777";
    let current: {
      id: string;
      organizationId: string;
      shootId: string;
      title: string;
      isCompleted: boolean;
      sortOrder: number;
      assignedCrewMemberId: string | null;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    } = {
      id: itemId,
      organizationId,
      shootId,
      title: "Charge batteries",
      isCompleted: false,
      sortOrder: 0,
      assignedCrewMemberId: null,
      completedAt: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };
    let removed = false;

    const repository = {
      create: vi.fn(async (input: {
        organizationId: string;
        shootId: string;
        title: string;
        sortOrder: number;
        assignedCrewMemberId?: string | null;
      }) => {
        current = { ...current, ...input };
        return current;
      }),
      update: vi.fn(async (_organizationId: string, requestedItemId: string, input: Partial<typeof current>) => {
        if (removed || requestedItemId !== itemId) return null;
        current = { ...current, ...input, updatedAt: new Date() };
        return current;
      }),
      remove: vi.fn(async (_organizationId: string, requestedItemId: string) => {
        if (removed || requestedItemId !== itemId) return false;
        removed = true;
        return true;
      }),
    };
    const service = createChecklistService(repository);

    const created = await service.create(organizationId, {
      shootId,
      title: "  Charge batteries  ",
      sortOrder: 2,
      assignedCrewMemberId: "",
    });
    expect(created.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledWith({
      organizationId,
      shootId,
      title: "Charge batteries",
      sortOrder: 2,
      assignedCrewMemberId: null,
    });

    const completed = await service.setCompleted(organizationId, itemId, true);
    expect(completed.ok && completed.data.isCompleted).toBe(true);
    expect(completed.ok && completed.data.completedAt).toBeInstanceOf(Date);

    const reopened = await service.setCompleted(organizationId, itemId, false);
    expect(reopened.ok && reopened.data.isCompleted).toBe(false);
    expect(reopened.ok && reopened.data.completedAt).toBeNull();

    await expect(service.remove(organizationId, itemId)).resolves.toEqual({ ok: true, data: null });
    await expect(service.remove(organizationId, itemId)).resolves.toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Checklist item not found." },
    });
  });
});
