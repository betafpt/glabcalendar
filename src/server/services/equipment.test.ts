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
  imageDataUrl: null,
  createdAt: new Date("2026-09-29T00:00:00Z"),
  updatedAt: new Date("2026-09-29T00:00:00Z"),
};

function repository(): EquipmentRepositoryPort {
  return {
    list: vi.fn(async () => [item]),
    findById: vi.fn(async () => item),
    create: vi.fn(async () => item),
    update: vi.fn(async () => item),
    remove: vi.fn(async () => true),
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

  it("accepts an uploaded equipment image data URL", async () => {
    const repo = repository();
    const imageDataUrl = "data:image/webp;base64,UklGRg==";
    await createEquipmentService(repo).create(item.organizationId, {
      name: "Sony FX3",
      status: "available",
      imageDataUrl,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ imageDataUrl }));
  });

  it("removes an equipment item", async () => {
    const repo = repository();
    await expect(createEquipmentService(repo).remove(item.organizationId, item.id)).resolves.toEqual({ ok: true, data: null });
  });
});
