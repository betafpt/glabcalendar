import { describe, expect, it, vi } from "vitest";
import type { Shoot } from "@/server/db/schema";
import { createCalendarService, type CalendarRepositoryPort } from "./calendar";

const shoot: Shoot = {
  id: "00000000-0000-0000-0000-000000000001",
  organizationId: "00000000-0000-0000-0000-000000000010",
  projectId: null,
  title: "Commercial shoot",
  status: "confirmed",
  startsAt: new Date("2026-09-29T03:00:00Z"),
  endsAt: new Date("2026-09-29T07:00:00Z"),
  callTime: null,
  locationName: null,
  locationAddress: null,
  notes: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function repository(): CalendarRepositoryPort {
  return { listRange: vi.fn(async () => [shoot]) };
}

describe("calendar service", () => {
  it("forwards a validated filter set to the repository", async () => {
    const repo = repository();
    const service = createCalendarService(repo);
    const start = new Date("2026-09-01T00:00:00Z");
    const end = new Date("2026-10-01T00:00:00Z");
    const projectId = "00000000-0000-0000-0000-000000000100";

    await expect(service.list(shoot.organizationId, start, end, { projectId })).resolves.toEqual([shoot]);
    expect(repo.listRange).toHaveBeenCalledWith(shoot.organizationId, start, end, { projectId });
  });

  it("drops invalid filter values instead of passing malformed ids to the database", async () => {
    const repo = repository();
    const service = createCalendarService(repo);
    await service.list(shoot.organizationId, shoot.startsAt, shoot.endsAt, { projectId: "bad-id" });
    expect(repo.listRange).toHaveBeenCalledWith(shoot.organizationId, shoot.startsAt, shoot.endsAt, {});
  });

  it("rejects an empty or reversed range before querying", async () => {
    const repo = repository();
    const service = createCalendarService(repo);
    await expect(service.list(shoot.organizationId, shoot.endsAt, shoot.startsAt)).rejects.toThrow("Calendar range must end after it starts.");
    expect(repo.listRange).not.toHaveBeenCalled();
  });
});
