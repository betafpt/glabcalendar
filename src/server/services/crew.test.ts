import { describe, expect, it, vi } from "vitest";
import type { CrewMember } from "@/server/db/schema";
import { createCrewService, type CrewRepositoryPort } from "./crew";

const crewMember: CrewMember = {
  id: "00000000-0000-0000-0000-000000000201",
  organizationId: "00000000-0000-0000-0000-000000000010",
  userId: null,
  name: "An Nguyen",
  defaultRole: "DOP",
  phone: null,
  email: null,
  status: "active",
  notes: null,
  avatarDataUrl: null,
  createdAt: new Date("2026-09-29T00:00:00Z"),
  updatedAt: new Date("2026-09-29T00:00:00Z"),
};

function repository(): CrewRepositoryPort {
  return {
    list: vi.fn(async () => [crewMember]),
    findById: vi.fn(async () => crewMember),
    create: vi.fn(async () => crewMember),
    update: vi.fn(async () => crewMember),
    remove: vi.fn(async () => true),
  };
}

describe("crew service", () => {
  it("normalizes optional fields before create", async () => {
    const repo = repository();
    const result = await createCrewService(repo).create(crewMember.organizationId, {
      name: "  An Nguyen  ",
      defaultRole: "  DOP  ",
      phone: "   ",
      email: "",
      status: "active",
      notes: "   ",
    });
    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: "An Nguyen", defaultRole: "DOP", phone: null, email: null, notes: null }));
  });

  it("rejects an invalid email", async () => {
    const repo = repository();
    const result = await createCrewService(repo).create(crewMember.organizationId, { name: "An", email: "bad-email", status: "active" });
    expect(result.ok).toBe(false);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("accepts an uploaded avatar data URL", async () => {
    const repo = repository();
    const avatarDataUrl = "data:image/webp;base64,UklGRg==";
    await createCrewService(repo).create(crewMember.organizationId, {
      name: "An",
      status: "active",
      avatarDataUrl,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ avatarDataUrl }));
  });

  it("removes a crew member", async () => {
    const repo = repository();
    await expect(createCrewService(repo).remove(crewMember.organizationId, crewMember.id)).resolves.toEqual({ ok: true, data: null });
  });
});
