import { describe, expect, it, vi } from "vitest";
import { createCrewAssignmentService } from "./crew-assignments";

const organizationId = "11111111-1111-4111-8111-111111111111";
const shootId = "22222222-2222-4222-8222-222222222222";
const crewMemberId = "33333333-3333-4333-8333-333333333333";

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

describe("crew assignment service", () => {
  it("returns typed conflict details and does not create an overlapping assignment", async () => {
    const create = vi.fn();
    const conflicts = [{ shootId: "44444444-4444-4444-8444-444444444444", title: "Portrait", startsAt: new Date("2026-10-01T10:00:00Z"), endsAt: new Date("2026-10-01T12:00:00Z") }];
    const service = createCrewAssignmentService(
      { findConflicts: vi.fn().mockResolvedValue(conflicts), create, remove: vi.fn() },
      { findById: vi.fn().mockResolvedValue(shoot) }
    );

    const result = await service.assign(organizationId, { shootId, crewMemberId, role: "DP" });

    expect(result).toEqual({ ok: false, error: { code: "CONFLICT", message: expect.any(String), conflicts } });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the assignment when the conflict query is empty", async () => {
    const assignment = { id: "55555555-5555-4555-8555-555555555555", organizationId, shootId, crewMemberId, role: "DP", notes: null, createdAt: new Date() };
    const create = vi.fn().mockResolvedValue(assignment);
    const service = createCrewAssignmentService(
      { findConflicts: vi.fn().mockResolvedValue([]), create, remove: vi.fn() },
      { findById: vi.fn().mockResolvedValue(shoot) }
    );

    const result = await service.assign(organizationId, { shootId, crewMemberId, role: "DP" });

    expect(result).toEqual({ ok: true, data: assignment });
    expect(create).toHaveBeenCalledOnce();
  });
});
