import { describe, expect, it, vi } from "vitest";
import { createChecklistService } from "./checklists";

describe("checklist service", () => {
  it("sets completion timestamp when completing an item", async () => {
    const update = vi.fn().mockImplementation(async (_org, _id, input) => ({ id: "33333333-3333-4333-8333-333333333333", organizationId: "11111111-1111-4111-8111-111111111111", shootId: "22222222-2222-4222-8222-222222222222", title: "Charge batteries", sortOrder: 0, assignedCrewMemberId: null, createdAt: new Date(), updatedAt: new Date(), ...input }));
    const service = createChecklistService({ create: vi.fn(), update, remove: vi.fn() });
    const result = await service.setCompleted("11111111-1111-4111-8111-111111111111", "33333333-3333-4333-8333-333333333333", true);
    expect(result.ok).toBe(true);
    expect(update.mock.calls[0]?.[2].isCompleted).toBe(true);
    expect(update.mock.calls[0]?.[2].completedAt).toBeInstanceOf(Date);
  });
});
