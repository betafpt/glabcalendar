import { describe, expect, it, vi } from "vitest";
import type { EquipmentItem } from "@/server/db/schema";
import { createEquipmentService, type EquipmentRepositoryPort } from "./equipment";

const item: EquipmentItem = {
  id: "00000000-0000-0000-0000-000000000301",
  organizationId: "00000000-0000-0000-0000-000000000010",
  name: "Sony FX3",
  category: "camera",
  assetCode: "CAM-001",
  serialNumber: null,
  status: "available",
  notes: null,
  createdAt: new Date("2026-09-29T00:00:00Z"),
  updatedAt: new Date("2026-09-29T00:00:00Z"),
};

function repository(): EquipmentRepositoryPort {
  return {
    list: vi.fn(async () => [item]),
    findById: vi.fn(async () => item),
    create: vi.fn(async () => item),
    update: vi.fn(async () => item),
  };
}

describe("equipment service", () => {
  it("normalizes optional equipment fields", async () => {
    const repo = repository();
    const result = await createEquipmentService(repo).create(item.organizationId, {
      name: "  Sony FX3  ", category: " camera ", assetCode: " CAM-001 ", serialNumber: " ", status: "available", notes: " ",
    });
    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Sony FX3", category: "camera", assetCode: "CAM-001", serialNumber: null, notes: null }));
  });

  it("rejects an unknown status", async () => {
    const repo = repository();
    const result = await createEquipmentService(repo).create(item.organizationId, { name: "Sony FX3", status: "lost" });
    expect(result.ok).toBe(false);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
