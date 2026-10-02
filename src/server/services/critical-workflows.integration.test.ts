import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  EquipmentBooking,
  Project,
  Shoot,
  ShootChecklistItem,
  ShootCrewAssignment,
} from "@/server/db/schema";
import { createCalendarService, type CalendarRepositoryPort } from "./calendar";
import { createChecklistService, type ChecklistRepositoryPort } from "./checklists";
import {
  createCrewAssignmentService,
  type CrewAssignmentRepositoryPort,
  type ShootLookupPort,
} from "./crew-assignments";
import {
  createEquipmentBookingService,
  type EquipmentBookingRepositoryPort,
} from "./equipment-bookings";
import { createProjectService, type ProjectRepositoryPort } from "./projects";
import { createShootService, type ShootRepositoryPort } from "./shoots";

const organizationId = "11111111-1111-4111-8111-111111111111";
const shootId = "22222222-2222-4222-8222-222222222222";

const shoot: Shoot = {
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
    const shootLookup: ShootLookupPort = { findById: vi.fn().mockResolvedValue(shoot) };

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
    let current: ShootChecklistItem = {
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

    const repository: ChecklistRepositoryPort = {
      create: vi.fn(async (input: {
        organizationId: string;
        shootId: string;
        title: string;
        sortOrder: number;
        assignedCrewMemberId?: string | null;
      }) => {
        current = {
          ...current,
          ...input,
          assignedCrewMemberId: input.assignedCrewMemberId ?? null,
        };
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

  it("validates checklist item creation and rejects invalid input", async () => {
    const repository: ChecklistRepositoryPort = {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    const service = createChecklistService(repository);

    // Empty title
    const emptyTitleResult = await service.create(organizationId, {
      shootId,
      title: "   ",
    });
    expect(emptyTitleResult.ok).toBe(false);
    if (!emptyTitleResult.ok) {
      expect(emptyTitleResult.error.code).toBe("VALIDATION_ERROR");
      expect(emptyTitleResult.error.message).toBe("Checklist item title is required.");
    }
    expect(repository.create).not.toHaveBeenCalled();

    // Invalid item ID for setCompleted
    const invalidIdResult = await service.setCompleted(organizationId, "not-a-uuid", true);
    expect(invalidIdResult.ok).toBe(false);
    if (!invalidIdResult.ok) {
      expect(invalidIdResult.error.code).toBe("VALIDATION_ERROR");
      expect(invalidIdResult.error.message).toBe("Checklist item id is invalid.");
    }
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("manages project-shoot relationships and read paths across service and repository boundaries", async () => {
    const orgId = "11111111-1111-4111-8111-111111111111";
    const projectStore = new Map<string, Project>();
    const shootStore = new Map<string, Shoot>();

    const projectRepo: ProjectRepositoryPort = {
      async list(organizationId: string) {
        return Array.from(projectStore.values())
          .filter((p) => p.organizationId === organizationId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findById(organizationId: string, projectId: string) {
        const p = projectStore.get(projectId);
        return p && p.organizationId === organizationId ? p : null;
      },
      async create(input) {
        const project: Project = {
          id: randomUUID(),
          organizationId: input.organizationId,
          name: input.name,
          clientName: input.clientName ?? null,
          status: input.status,
          startsOn: input.startsOn ?? null,
          endsOn: input.endsOn ?? null,
          notes: input.notes ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          createdAt: new Date("2026-10-01T00:00:00Z"),
          updatedAt: new Date("2026-10-01T00:00:00Z"),
        };
        projectStore.set(project.id, project);
        return project;
      },
      async update(organizationId: string, projectId: string, input) {
        const existing = projectStore.get(projectId);
        if (!existing || existing.organizationId !== organizationId) return null;
        const updated: Project = {
          ...existing,
          ...input,
          updatedAt: new Date(),
        };
        projectStore.set(projectId, updated);
        return updated;
      },
      async remove(organizationId: string, projectId: string) {
        const existing = projectStore.get(projectId);
        if (!existing || existing.organizationId !== organizationId) return false;
        return projectStore.delete(projectId);
      },
    };

    const shootRepo: ShootRepositoryPort = {
      async list(organizationId: string) {
        return Array.from(shootStore.values())
          .filter((s) => s.organizationId === organizationId)
          .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
      },
      async findById(organizationId: string, shootId: string) {
        const s = shootStore.get(shootId);
        return s && s.organizationId === organizationId ? s : null;
      },
      async create(input) {
        const shootItem: Shoot = {
          id: randomUUID(),
          organizationId: input.organizationId,
          projectId: input.projectId ?? null,
          title: input.title,
          status: input.status,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          callTime: input.callTime ?? null,
          locationName: input.locationName ?? null,
          locationAddress: input.locationAddress ?? null,
          notes: input.notes ?? null,
          createdAt: new Date("2026-10-01T00:00:00Z"),
          updatedAt: new Date("2026-10-01T00:00:00Z"),
        };
        shootStore.set(shootItem.id, shootItem);
        return shootItem;
      },
      async update(organizationId: string, targetShootId: string, input) {
        const existing = shootStore.get(targetShootId);
        if (!existing || existing.organizationId !== organizationId) return null;
        const updated: Shoot = {
          ...existing,
          ...input,
          updatedAt: new Date(),
        };
        shootStore.set(targetShootId, updated);
        return updated;
      },
      async remove(organizationId: string, targetShootId: string) {
        const existing = shootStore.get(targetShootId);
        if (!existing || existing.organizationId !== organizationId) return false;
        return shootStore.delete(targetShootId);
      },
    };

    const projectService = createProjectService(projectRepo);
    const shootService = createShootService(shootRepo);

    // 1. Create a project
    const projectResult = await projectService.create(orgId, {
      name: "Autumn Fashion Lookbook",
      clientName: "Zara Studio",
      status: "active",
      startsOn: "2026-10-01",
      endsOn: "2026-10-31",
      notes: "Outdoor and indoor fashion shoot",
    });
    expect(projectResult.ok).toBe(true);
    if (!projectResult.ok) return;
    const project = projectResult.data;
    expect(project.id).toBeDefined();

    // 2. Create shoots: two linked to the project, one standalone
    const shoot1Result = await shootService.create(orgId, {
      projectId: project.id,
      title: "Lookbook Day 1 - Urban",
      status: "confirmed",
      startsAt: "2026-10-05T08:00:00Z",
      endsAt: "2026-10-05T16:00:00Z",
      locationName: "Downtown Square",
    });
    expect(shoot1Result.ok).toBe(true);
    if (!shoot1Result.ok) return;
    const shoot1 = shoot1Result.data;

    const shoot2Result = await shootService.create(orgId, {
      projectId: project.id,
      title: "Lookbook Day 2 - Studio",
      status: "planned",
      startsAt: "2026-10-08T09:00:00Z",
      endsAt: "2026-10-08T18:00:00Z",
      locationName: "Studio B",
    });
    expect(shoot2Result.ok).toBe(true);
    if (!shoot2Result.ok) return;
    const shoot2 = shoot2Result.data;

    const standaloneShootResult = await shootService.create(orgId, {
      projectId: null,
      title: "Express Portrait Session",
      status: "confirmed",
      startsAt: "2026-10-12T10:00:00Z",
      endsAt: "2026-10-12T12:00:00Z",
    });
    expect(standaloneShootResult.ok).toBe(true);
    if (!standaloneShootResult.ok) return;
    const standaloneShoot = standaloneShootResult.data;

    // 3. Read paths: get by id and list
    const fetchedShoot1 = await shootService.get(orgId, shoot1.id);
    expect(fetchedShoot1).not.toBeNull();
    expect(fetchedShoot1?.projectId).toBe(project.id);
    expect(fetchedShoot1?.title).toBe("Lookbook Day 1 - Urban");

    const allShoots = await shootService.list(orgId);
    expect(allShoots).toHaveLength(3);
    const projectShoots = allShoots.filter((s) => s.projectId === project.id);
    expect(projectShoots).toHaveLength(2);
    expect(projectShoots.map((s) => s.id)).toEqual(
      expect.arrayContaining([shoot1.id, shoot2.id])
    );

    // 4. Update relationship: unlink shoot2 from project
    const unlinkResult = await shootService.update(orgId, shoot2.id, {
      projectId: null,
      title: shoot2.title,
      status: shoot2.status,
      startsAt: shoot2.startsAt,
      endsAt: shoot2.endsAt,
    });
    expect(unlinkResult.ok).toBe(true);
    if (!unlinkResult.ok) return;
    expect(unlinkResult.data.projectId).toBeNull();

    // Verify persistence of unlinking
    const refetchedShoot2 = await shootService.get(orgId, shoot2.id);
    expect(refetchedShoot2?.projectId).toBeNull();

    // 5. Update relationship: link the standalone shoot to the project
    const linkResult = await shootService.update(orgId, standaloneShoot.id, {
      projectId: project.id,
      title: standaloneShoot.title,
      status: standaloneShoot.status,
      startsAt: standaloneShoot.startsAt,
      endsAt: standaloneShoot.endsAt,
    });
    expect(linkResult.ok).toBe(true);
    if (!linkResult.ok) return;
    expect(linkResult.data.projectId).toBe(project.id);

    // 6. Error handling: non-existent shoot update
    const invalidId = "99999999-9999-4999-8999-999999999999";
    const notFoundResult = await shootService.update(orgId, invalidId, {
      title: "Ghost shoot",
      startsAt: new Date("2026-10-01T00:00:00Z"),
      endsAt: new Date("2026-10-01T01:00:00Z"),
    });
    expect(notFoundResult.ok).toBe(false);
    if (!notFoundResult.ok) {
      expect(notFoundResult.error.code).toBe("NOT_FOUND");
    }

    // 7. Validation failure does not persist
    const invalidTimingResult = await shootService.create(orgId, {
      title: "Time Travel Shoot",
      startsAt: "2026-10-20T10:00:00Z",
      endsAt: "2026-10-20T08:00:00Z",
    });
    expect(invalidTimingResult.ok).toBe(false);
    const postInvalidCount = await shootService.list(orgId);
    expect(postInvalidCount).toHaveLength(3);
  });

  it("enforces crew assignment conflict detection and persistence across overlapping shoots", async () => {
    const orgId = "11111111-1111-4111-8111-111111111111";
    const crewMemberId = "33333333-3333-4333-8333-333333333333";

    const shoot1: Shoot = {
      id: "10000000-0000-4000-8000-000000000001",
      organizationId: orgId,
      projectId: null,
      title: "Morning Commercial",
      status: "confirmed",
      startsAt: new Date("2026-10-01T09:00:00Z"),
      endsAt: new Date("2026-10-01T12:00:00Z"),
      callTime: null,
      locationName: "Studio 1",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shoot2: Shoot = {
      id: "10000000-0000-4000-8000-000000000002",
      organizationId: orgId,
      projectId: null,
      title: "Midday Interview",
      status: "confirmed",
      startsAt: new Date("2026-10-01T11:00:00Z"),
      endsAt: new Date("2026-10-01T14:00:00Z"),
      callTime: null,
      locationName: "Office Tower",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shoot3: Shoot = {
      id: "10000000-0000-4000-8000-000000000003",
      organizationId: orgId,
      projectId: null,
      title: "Evening Event",
      status: "confirmed",
      startsAt: new Date("2026-10-01T14:00:00Z"),
      endsAt: new Date("2026-10-01T17:00:00Z"),
      callTime: null,
      locationName: "Convention Center",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shootsMap = new Map<string, Shoot>([
      [shoot1.id, shoot1],
      [shoot2.id, shoot2],
      [shoot3.id, shoot3],
    ]);

    const shootLookup: ShootLookupPort = {
      async findById(organizationId: string, requestedShootId: string) {
        const s = shootsMap.get(requestedShootId);
        return s && s.organizationId === organizationId ? s : null;
      },
    };

    const assignmentsStore: ShootCrewAssignment[] = [];

    const assignmentsRepo: CrewAssignmentRepositoryPort = {
      async findConflicts(organizationId, targetCrewMemberId, targetShootId, startsAt, endsAt) {
        return assignmentsStore
          .filter(
            (a) =>
              a.organizationId === organizationId &&
              a.crewMemberId === targetCrewMemberId &&
              a.shootId !== targetShootId
          )
          .map((a) => shootsMap.get(a.shootId)!)
          .filter(
            (s): s is Shoot =>
              Boolean(s) &&
              s.status !== "cancelled" &&
              s.startsAt < endsAt &&
              s.endsAt > startsAt
          )
          .map((s) => ({
            shootId: s.id,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
          }));
      },
      async create(input) {
        const assignment: ShootCrewAssignment = {
          id: randomUUID(),
          organizationId: input.organizationId,
          shootId: input.shootId,
          crewMemberId: input.crewMemberId,
          role: input.role ?? null,
          notes: input.notes ?? null,
          createdAt: new Date(),
        };
        assignmentsStore.push(assignment);
        return assignment;
      },
      async remove(organizationId, assignmentId) {
        const idx = assignmentsStore.findIndex(
          (a) => a.organizationId === organizationId && a.id === assignmentId
        );
        if (idx === -1) return false;
        assignmentsStore.splice(idx, 1);
        return true;
      },
    };

    const service = createCrewAssignmentService(assignmentsRepo, shootLookup);

    // 1. Assign crew member to Shoot 1 -> should succeed and persist
    const assignResult1 = await service.assign(orgId, {
      shootId: shoot1.id,
      crewMemberId,
      role: "Director of Photography",
    });
    expect(assignResult1.ok).toBe(true);
    if (!assignResult1.ok) return;
    expect(assignResult1.data.shootId).toBe(shoot1.id);
    expect(assignResult1.data.role).toBe("Director of Photography");
    expect(assignmentsStore).toHaveLength(1);

    // 2. Attempt assigning same crew member to overlapping Shoot 2 -> should return CONFLICT
    const assignResult2 = await service.assign(orgId, {
      shootId: shoot2.id,
      crewMemberId,
      role: "Gaffer",
    });
    expect(assignResult2.ok).toBe(false);
    if (!assignResult2.ok) {
      expect(assignResult2.error.code).toBe("CONFLICT");
      expect(assignResult2.error.conflicts).toEqual([
        {
          shootId: shoot1.id,
          title: "Morning Commercial",
          startsAt: shoot1.startsAt,
          endsAt: shoot1.endsAt,
        },
      ]);
    }
    // Persistence check: no second assignment was created
    expect(assignmentsStore).toHaveLength(1);

    // 3. Assign same crew member to non-overlapping Shoot 3 -> should succeed and persist
    const assignResult3 = await service.assign(orgId, {
      shootId: shoot3.id,
      crewMemberId,
      role: "Camera Operator",
    });
    expect(assignResult3.ok).toBe(true);
    expect(assignmentsStore).toHaveLength(2);

    // 4. Attempt assignment to a non-existent shoot ID
    const invalidShootId = "99999999-9999-4999-8999-999999999999";
    const notFoundShoot = await service.assign(orgId, {
      shootId: invalidShootId,
      crewMemberId,
      role: "Sound",
    });
    expect(notFoundShoot).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Shoot not found." },
    });

    // 5. Remove assignment from Shoot 1
    const removal = await service.remove(orgId, assignResult1.data.id);
    expect(removal).toEqual({ ok: true, data: null });
    expect(assignmentsStore).toHaveLength(1);

    // 6. Now that Shoot 1 assignment is removed, assigning to Shoot 2 succeeds without conflict
    const retryShoot2 = await service.assign(orgId, {
      shootId: shoot2.id,
      crewMemberId,
      role: "Gaffer",
    });
    expect(retryShoot2.ok).toBe(true);
    expect(assignmentsStore).toHaveLength(2);

    // 7. Removing an already removed assignment returns NOT_FOUND
    const doubleRemoval = await service.remove(orgId, assignResult1.data.id);
    expect(doubleRemoval).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Crew assignment not found." },
    });
  });

  it("enforces equipment booking conflict detection and persistence across overlapping shoots", async () => {
    const orgId = "11111111-1111-4111-8111-111111111111";
    const equipmentItemId = "44444444-4444-4444-8444-444444444444";

    const shootA: Shoot = {
      id: "20000000-0000-4000-8000-000000000001",
      organizationId: orgId,
      projectId: null,
      title: "Morning Studio Session",
      status: "confirmed",
      startsAt: new Date("2026-10-02T08:00:00Z"),
      endsAt: new Date("2026-10-02T12:00:00Z"),
      callTime: null,
      locationName: "Studio A",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shootB: Shoot = {
      id: "20000000-0000-4000-8000-000000000002",
      organizationId: orgId,
      projectId: null,
      title: "Midday Field Recording",
      status: "confirmed",
      startsAt: new Date("2026-10-02T10:00:00Z"),
      endsAt: new Date("2026-10-02T14:00:00Z"),
      callTime: null,
      locationName: "Botanical Garden",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shootC: Shoot = {
      id: "20000000-0000-4000-8000-000000000003",
      organizationId: orgId,
      projectId: null,
      title: "Evening Broadcast",
      status: "confirmed",
      startsAt: new Date("2026-10-02T14:00:00Z"),
      endsAt: new Date("2026-10-02T18:00:00Z"),
      callTime: null,
      locationName: "Main Hall",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-20T00:00:00Z"),
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    };

    const shootsMap = new Map<string, Shoot>([
      [shootA.id, shootA],
      [shootB.id, shootB],
      [shootC.id, shootC],
    ]);

    const shootLookup: ShootLookupPort = {
      async findById(organizationId: string, requestedShootId: string) {
        const s = shootsMap.get(requestedShootId);
        return s && s.organizationId === organizationId ? s : null;
      },
    };

    const bookingsStore: EquipmentBooking[] = [];

    const bookingsRepo: EquipmentBookingRepositoryPort = {
      async findConflicts(organizationId, targetItemId, targetShootId, startsAt, endsAt) {
        return bookingsStore
          .filter(
            (b) =>
              b.organizationId === organizationId &&
              b.equipmentItemId === targetItemId &&
              b.shootId !== targetShootId
          )
          .map((b) => shootsMap.get(b.shootId)!)
          .filter(
            (s): s is Shoot =>
              Boolean(s) &&
              s.status !== "cancelled" &&
              s.startsAt < endsAt &&
              s.endsAt > startsAt
          )
          .map((s) => ({
            shootId: s.id,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
          }));
      },
      async create(input) {
        const booking: EquipmentBooking = {
          id: randomUUID(),
          organizationId: input.organizationId,
          shootId: input.shootId,
          equipmentItemId: input.equipmentItemId,
          quantity: input.quantity ?? 1,
          notes: input.notes ?? null,
          createdAt: new Date(),
        };
        bookingsStore.push(booking);
        return booking;
      },
      async remove(organizationId, bookingId) {
        const idx = bookingsStore.findIndex(
          (b) => b.organizationId === organizationId && b.id === bookingId
        );
        if (idx === -1) return false;
        bookingsStore.splice(idx, 1);
        return true;
      },
    };

    const service = createEquipmentBookingService(bookingsRepo, shootLookup);

    // 1. Book equipment for Shoot A -> succeeds and persists
    const bookA = await service.book(orgId, {
      shootId: shootA.id,
      equipmentItemId,
      quantity: 2,
      notes: "Main and B-cam",
    });
    expect(bookA.ok).toBe(true);
    if (!bookA.ok) return;
    expect(bookA.data.shootId).toBe(shootA.id);
    expect(bookA.data.quantity).toBe(2);
    expect(bookingsStore).toHaveLength(1);

    // 2. Attempt to book same equipment for overlapping Shoot B -> fails with CONFLICT
    const bookB = await service.book(orgId, {
      shootId: shootB.id,
      equipmentItemId,
      quantity: 1,
    });
    expect(bookB.ok).toBe(false);
    if (!bookB.ok) {
      expect(bookB.error.code).toBe("CONFLICT");
      expect(bookB.error.conflicts).toEqual([
        {
          shootId: shootA.id,
          title: "Morning Studio Session",
          startsAt: shootA.startsAt,
          endsAt: shootA.endsAt,
        },
      ]);
    }
    // Persistence check: no booking for Shoot B was created
    expect(bookingsStore).toHaveLength(1);

    // 3. Book same equipment for non-overlapping Shoot C -> succeeds and persists
    const bookC = await service.book(orgId, {
      shootId: shootC.id,
      equipmentItemId,
      quantity: 1,
    });
    expect(bookC.ok).toBe(true);
    expect(bookingsStore).toHaveLength(2);

    // 4. Validation error: non-positive quantity rejected before checking repository
    const invalidQuantity = await service.book(orgId, {
      shootId: shootC.id,
      equipmentItemId,
      quantity: 0,
    });
    expect(invalidQuantity.ok).toBe(false);
    if (!invalidQuantity.ok) {
      expect(invalidQuantity.error.code).toBe("VALIDATION_ERROR");
    }

    // 5. Remove booking from Shoot A
    const removeA = await service.remove(orgId, bookA.data.id);
    expect(removeA).toEqual({ ok: true, data: null });
    expect(bookingsStore).toHaveLength(1);

    // 6. Now booking for Shoot B succeeds since Shoot A conflict is cleared
    const retryB = await service.book(orgId, {
      shootId: shootB.id,
      equipmentItemId,
      quantity: 1,
    });
    expect(retryB.ok).toBe(true);
    expect(bookingsStore).toHaveLength(2);

    // 7. Removing already removed booking returns NOT_FOUND
    const doubleRemoval = await service.remove(orgId, bookA.data.id);
    expect(doubleRemoval).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Equipment booking not found." },
    });
  });

  it("queries calendar range and read paths with project, crew, and equipment filters", async () => {
    const orgId = "11111111-1111-4111-8111-111111111111";
    const projectAId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const projectBId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const crew1Id = "cccccccc-1111-4ccc-8ccc-cccccccccccc";
    const crew2Id = "cccccccc-2222-4ccc-8ccc-cccccccccccc";
    const equip1Id = "eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee";
    const equip2Id = "eeeeeeee-2222-4eee-8eee-eeeeeeeeeeee";

    // Shoots across October and November:
    const shoot1: Shoot = {
      id: "30000000-0000-4000-8000-000000000001",
      organizationId: orgId,
      projectId: projectAId,
      title: "Brand Commercial Oct 5",
      status: "confirmed",
      startsAt: new Date("2026-10-05T09:00:00Z"),
      endsAt: new Date("2026-10-05T17:00:00Z"),
      callTime: null,
      locationName: "Studio 1",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    };

    const shoot2: Shoot = {
      id: "30000000-0000-4000-8000-000000000002",
      organizationId: orgId,
      projectId: projectBId,
      title: "Music Video Oct 15",
      status: "confirmed",
      startsAt: new Date("2026-10-15T10:00:00Z"),
      endsAt: new Date("2026-10-15T18:00:00Z"),
      callTime: null,
      locationName: "Warehouse 4",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    };

    const shoot3: Shoot = {
      id: "30000000-0000-4000-8000-000000000003",
      organizationId: orgId,
      projectId: projectAId,
      title: "Interview Shoot Oct 25",
      status: "planned",
      startsAt: new Date("2026-10-25T13:00:00Z"),
      endsAt: new Date("2026-10-25T16:00:00Z"),
      callTime: null,
      locationName: "Downtown Office",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    };

    const shoot4: Shoot = {
      id: "30000000-0000-4000-8000-000000000004",
      organizationId: orgId,
      projectId: projectAId,
      title: "Holiday Special Nov 10",
      status: "planned",
      startsAt: new Date("2026-11-10T09:00:00Z"),
      endsAt: new Date("2026-11-10T15:00:00Z"),
      callTime: null,
      locationName: "Stage 2",
      locationAddress: null,
      notes: null,
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    };

    const shootsList: Shoot[] = [shoot1, shoot2, shoot3, shoot4];
    const shootCrewMap = new Map<string, string[]>([
      [shoot1.id, [crew1Id]],
      [shoot2.id, [crew2Id]],
      [shoot3.id, [crew2Id]],
      [shoot4.id, [crew1Id]],
    ]);
    const shootEquipMap = new Map<string, string[]>([
      [shoot1.id, [equip1Id]],
      [shoot2.id, [equip1Id]],
      [shoot3.id, [equip2Id]],
      [shoot4.id, []],
    ]);

    const calendarRepo: CalendarRepositoryPort = {
      async listRange(organizationId, start, end, filters = {}) {
        return shootsList
          .filter((s) => s.organizationId === organizationId)
          .filter((s) => s.startsAt < end && s.endsAt > start)
          .filter((s) => {
            if (filters.projectId && s.projectId !== filters.projectId) return false;
            if (filters.crewMemberId) {
              const assigned = shootCrewMap.get(s.id) ?? [];
              if (!assigned.includes(filters.crewMemberId)) return false;
            }
            if (filters.equipmentItemId) {
              const booked = shootEquipMap.get(s.id) ?? [];
              if (!booked.includes(filters.equipmentItemId)) return false;
            }
            return true;
          })
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      },
    };

    const calendarService = createCalendarService(calendarRepo);
    const octStart = new Date("2026-10-01T00:00:00Z");
    const octEnd = new Date("2026-11-01T00:00:00Z");

    // 1. Query full October range without filters: returns Shoots 1, 2, 3 (excludes Nov shoot4)
    const allOctober = await calendarService.list(orgId, octStart, octEnd);
    expect(allOctober).toHaveLength(3);
    expect(allOctober.map((s) => s.id)).toEqual([shoot1.id, shoot2.id, shoot3.id]);

    // 2. Query October range filtered by Project A: returns Shoots 1 and 3
    const projectAShoots = await calendarService.list(orgId, octStart, octEnd, {
      projectId: projectAId,
    });
    expect(projectAShoots.map((s) => s.id)).toEqual([shoot1.id, shoot3.id]);

    // 3. Query October range filtered by Crew Member 2: returns Shoots 2 and 3
    const crew2Shoots = await calendarService.list(orgId, octStart, octEnd, {
      crewMemberId: crew2Id,
    });
    expect(crew2Shoots.map((s) => s.id)).toEqual([shoot2.id, shoot3.id]);

    // 4. Query October range filtered by Equipment Item 1: returns Shoots 1 and 2
    const equip1Shoots = await calendarService.list(orgId, octStart, octEnd, {
      equipmentItemId: equip1Id,
    });
    expect(equip1Shoots.map((s) => s.id)).toEqual([shoot1.id, shoot2.id]);

    // 5. Query with multi-filter (Project A + Equipment 2): returns only Shoot 3
    const combined = await calendarService.list(orgId, octStart, octEnd, {
      projectId: projectAId,
      equipmentItemId: equip2Id,
    });
    expect(combined.map((s) => s.id)).toEqual([shoot3.id]);

    // 6. Graceful handling of invalid filter: drops malformed filter and continues
    const resilientQuery = await calendarService.list(orgId, octStart, octEnd, {
      projectId: projectAId,
      crewMemberId: "not-a-valid-uuid",
    });
    expect(resilientQuery.map((s) => s.id)).toEqual([shoot1.id, shoot3.id]);

    // 7. Range validation: inverted date range throws
    await expect(calendarService.list(orgId, octEnd, octStart)).rejects.toThrow(
      "Calendar range must end after it starts."
    );
  });
});
