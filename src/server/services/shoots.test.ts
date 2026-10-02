import { describe, expect, it, vi } from "vitest";
import type { Shoot } from "@/server/db/schema";
import { createShootService, type ShootRepositoryPort } from "./shoots";

const shoot: Shoot = {
  id: "00000000-0000-0000-0000-000000000101",
  organizationId: "00000000-0000-0000-0000-000000000010",
  projectId: null,
  title: "Campaign shoot",
  status: "planned",
  startsAt: new Date("2026-10-03T02:00:00Z"),
  endsAt: new Date("2026-10-03T10:00:00Z"),
  callTime: null,
  locationName: null,
  locationAddress: null,
  notes: null,
  createdAt: new Date("2026-09-29T00:00:00Z"),
  updatedAt: new Date("2026-09-29T00:00:00Z"),
};

function repository(): ShootRepositoryPort {
  return {
    list: vi.fn(async () => [shoot]),
    findById: vi.fn(async () => shoot),
    create: vi.fn(async () => shoot),
    update: vi.fn(async () => shoot),
    remove: vi.fn(async () => true),
  };
}

describe("shoot service", () => {
  it("normalizes shoot input and converts timestamps before create", async () => {
    const repo = repository();
    const service = createShootService(repo);
    const result = await service.create(shoot.organizationId, {
      projectId: "",
      title: "  Campaign shoot  ",
      status: "planned",
      startsAt: "2026-10-03T09:00:00+07:00",
      endsAt: "2026-10-03T17:00:00+07:00",
      callTime: "",
      locationName: "  Studio A  ",
      locationAddress: "   ",
      notes: "  bring backup batteries  ",
    });

    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: null,
        title: "Campaign shoot",
        startsAt: new Date("2026-10-03T02:00:00Z"),
        endsAt: new Date("2026-10-03T10:00:00Z"),
        callTime: null,
        locationName: "Studio A",
        locationAddress: null,
        notes: "bring backup batteries",
      })
    );
  });

  it("rejects a shoot whose end time is not after its start time", async () => {
    const repo = repository();
    const service = createShootService(repo);
    const result = await service.create(shoot.organizationId, {
      title: "Campaign shoot",
      status: "planned",
      startsAt: "2026-10-03T09:00:00Z",
      endsAt: "2026-10-03T09:00:00Z",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.endsAt).toBeDefined();
    }
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("removes a shoot", async () => {
    const repo = repository();
    await expect(createShootService(repo).remove(shoot.organizationId, shoot.id)).resolves.toEqual({ ok: true, data: null });
  });
});
