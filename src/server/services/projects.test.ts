import { describe, expect, it, vi } from "vitest";
import type { Project } from "@/server/db/schema";
import { createProjectService, type ProjectRepositoryPort } from "./projects";

const project: Project = {
  id: "00000000-0000-0000-0000-000000000001",
  organizationId: "00000000-0000-0000-0000-000000000010",
  name: "Campaign A",
  clientName: null,
  status: "planned",
  startsOn: "2026-10-01",
  endsOn: "2026-10-02",
  notes: null,
  coverImageUrl: null,
  createdAt: new Date("2026-09-29T00:00:00Z"),
  updatedAt: new Date("2026-09-29T00:00:00Z"),
};

function repository(): ProjectRepositoryPort {
  return {
    list: vi.fn(async () => [project]),
    findById: vi.fn(async () => project),
    create: vi.fn(async () => project),
    update: vi.fn(async () => project),
    remove: vi.fn(async () => true),
  };
}

describe("project service", () => {
  it("normalizes project input before create", async () => {
    const repo = repository();
    const service = createProjectService(repo);
    const result = await service.create(project.organizationId, {
      name: "  Campaign A  ",
      clientName: "   ",
      status: "planned",
      startsOn: "2026-10-01",
      endsOn: "2026-10-02",
      notes: "  prep  ",
    });

    expect(result.ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Campaign A",
        clientName: null,
        notes: "prep",
      })
    );
  });

  it("rejects an end date before the start date", async () => {
    const repo = repository();
    const service = createProjectService(repo);
    const result = await service.create(project.organizationId, {
      name: "Campaign A",
      status: "planned",
      startsOn: "2026-10-03",
      endsOn: "2026-10-02",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.endsOn).toBeDefined();
    }
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("removes a project and reports missing projects", async () => {
    const repo = repository();
    const service = createProjectService(repo);
    await expect(service.remove(project.organizationId, project.id)).resolves.toEqual({ ok: true, data: null });
    vi.mocked(repo.remove).mockResolvedValueOnce(false);
    await expect(service.remove(project.organizationId, project.id)).resolves.toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Project not found." },
    });
  });
});
