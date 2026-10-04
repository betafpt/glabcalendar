import { describe, expect, it, vi } from "vitest";
import type { CrewConflict } from "@/server/db/crew-assignments";
import type { EquipmentConflict } from "@/server/db/equipment-bookings";
import type { Project, Shoot, ShootChecklistItem } from "@/server/db/schema";
import { DEFAULT_APP_TIMEZONE } from "@/lib/config";
import {
  calculateDashboardReadiness,
  createDashboardService,
  sortShootsChronologically,
  type CalendarRepositoryPort,
  type ChecklistRepositoryPort,
  type CrewAssignmentRepositoryPort,
  type DashboardRepositoriesPort,
  type DashboardShoot,
  type EquipmentBookingRepositoryPort,
  type ProjectRepositoryPort,
} from "./dashboard";

const orgId = "00000000-0000-0000-0000-000000000001";
const projId = "00000000-0000-0000-0000-000000000100";

const mockProject: Project = {
  id: projId,
  organizationId: orgId,
  name: "Summer Campaign",
  clientName: "Acme Corp",
  status: "active",
  startsOn: "2026-09-01",
  endsOn: "2026-09-30",
  notes: "Principal photography",
  coverImageUrl: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function createMockShoot(overrides: Partial<Shoot>): Shoot {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    organizationId: orgId,
    projectId: null,
    title: "Morning Scene",
    status: "confirmed",
    startsAt: new Date("2026-09-29T02:00:00Z"),
    endsAt: new Date("2026-09-29T06:00:00Z"),
    callTime: null,
    locationName: "Studio A",
    locationAddress: null,
    notes: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    syncPolicy: "local_only",
    isTestData: false,
    sourceCalendarId: null,
    externalEventId: null,
    ...overrides,
  };
}

function createMockRepositories(overrides?: {
  shoots?: Shoot[];
  projects?: Project[];
  crewRows?: Array<{ crewMember: { id: string } }>;
  crewConflicts?: CrewConflict[];
  equipmentRows?: Array<{ equipmentItem: { id: string } }>;
  equipmentConflicts?: EquipmentConflict[];
  checklistItems?: Array<Pick<ShootChecklistItem, "id" | "isCompleted">>;
}): {
  ports: DashboardRepositoriesPort;
  calendar: CalendarRepositoryPort;
  projects: ProjectRepositoryPort;
  crewAssignments: CrewAssignmentRepositoryPort;
  equipmentBookings: EquipmentBookingRepositoryPort;
  checklists: ChecklistRepositoryPort;
} {
  const calendar: CalendarRepositoryPort = {
    listRange: vi.fn(async () => overrides?.shoots ?? []),
  };

  const projects: ProjectRepositoryPort = {
    list: vi.fn(async () => overrides?.projects ?? [mockProject]),
  };

  const crewAssignments: CrewAssignmentRepositoryPort = {
    listForShoot: vi.fn(async () => overrides?.crewRows ?? []),
    findConflicts: vi.fn(async () => overrides?.crewConflicts ?? []),
  };

  const equipmentBookings: EquipmentBookingRepositoryPort = {
    listForShoot: vi.fn(async () => overrides?.equipmentRows ?? []),
    findConflicts: vi.fn(async () => overrides?.equipmentConflicts ?? []),
  };

  const checklists: ChecklistRepositoryPort = {
    listForShoot: vi.fn(async () => overrides?.checklistItems ?? []),
  };

  return {
    ports: { calendar, projects, crewAssignments, equipmentBookings, checklists },
    calendar,
    projects,
    crewAssignments,
    equipmentBookings,
    checklists,
  };
}

describe("Today Dashboard query model (M3-T05)", () => {
  describe("Chronological ordering", () => {
    it("sorts shoots strictly in ascending chronological order by startsAt, then endsAt, then title", async () => {
      const shoot1 = createMockShoot({
        id: "1",
        title: "Late Afternoon Shoot",
        startsAt: new Date("2026-09-29T09:00:00Z"),
        endsAt: new Date("2026-09-29T12:00:00Z"),
      });
      const shoot2 = createMockShoot({
        id: "2",
        title: "Early Morning Shoot",
        startsAt: new Date("2026-09-29T01:00:00Z"),
        endsAt: new Date("2026-09-29T04:00:00Z"),
      });
      const shoot3 = createMockShoot({
        id: "3",
        title: "Midday B Shoot",
        startsAt: new Date("2026-09-29T05:00:00Z"),
        endsAt: new Date("2026-09-29T08:00:00Z"),
      });
      const shoot4 = createMockShoot({
        id: "4",
        title: "Midday A Shoot",
        startsAt: new Date("2026-09-29T05:00:00Z"),
        endsAt: new Date("2026-09-29T07:00:00Z"),
      });

      // Provide shoots out of order from the repository
      const { ports } = createMockRepositories({
        shoots: [shoot1, shoot2, shoot3, shoot4],
      });
      const service = createDashboardService(ports);

      const rows = await service.listRange(
        orgId,
        new Date("2026-09-29T00:00:00Z"),
        new Date("2026-09-29T23:59:59Z")
      );

      expect(rows.map((r) => r.shoot.id)).toEqual(["2", "4", "3", "1"]);
    });

    it("pure sortShootsChronologically utility handles start, end, and title ties", () => {
      const items = [
        { shoot: { title: "Zebra", startsAt: new Date("2026-09-29T05:00:00Z"), endsAt: new Date("2026-09-29T08:00:00Z") } },
        { shoot: { title: "Alpha", startsAt: new Date("2026-09-29T05:00:00Z"), endsAt: new Date("2026-09-29T08:00:00Z") } },
        { shoot: { title: "Early", startsAt: new Date("2026-09-29T01:00:00Z"), endsAt: new Date("2026-09-29T03:00:00Z") } },
      ];
      const sorted = sortShootsChronologically(items);
      expect(sorted.map((i) => i.shoot.title)).toEqual(["Early", "Alpha", "Zebra"]);
    });
  });

  describe("Timezone handling", () => {
    it("queries calendar repository with UTC boundaries derived from organization timezone (Asia/Ho_Chi_Minh)", async () => {
      const anchor = new Date("2026-09-29T05:00:00Z"); // 12:00 PM local in GMT+7
      const { ports, calendar } = createMockRepositories();
      const service = createDashboardService(ports);

      await service.listToday(orgId, { timezone: "Asia/Ho_Chi_Minh", anchor });

      expect(calendar.listRange).toHaveBeenCalledWith(
        orgId,
        new Date("2026-09-28T17:00:00.000Z"), // midnight Sept 29 in GMT+7
        new Date("2026-09-29T17:00:00.000Z")  // midnight Sept 30 in GMT+7
      );
    });

    it("accepts timezone string directly as parameter", async () => {
      const anchor = new Date("2026-09-29T05:00:00Z");
      const { ports, calendar } = createMockRepositories();
      const service = createDashboardService(ports);

      await service.listToday(orgId, "Asia/Ho_Chi_Minh", anchor);

      expect(calendar.listRange).toHaveBeenCalledWith(
        orgId,
        new Date("2026-09-28T17:00:00.000Z"),
        new Date("2026-09-29T17:00:00.000Z")
      );
    });

    it("falls back to DEFAULT_APP_TIMEZONE for invalid timezone strings", async () => {
      const anchor = new Date("2026-09-29T05:00:00Z");
      const { ports, calendar } = createMockRepositories();
      const service = createDashboardService(ports);

      await service.listToday(orgId, { timezone: "Invalid/Timezone", anchor });

      // DEFAULT_APP_TIMEZONE is Asia/Ho_Chi_Minh
      expect(DEFAULT_APP_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
      expect(calendar.listRange).toHaveBeenCalledWith(
        orgId,
        new Date("2026-09-28T17:00:00.000Z"),
        new Date("2026-09-29T17:00:00.000Z")
      );
    });
  });

  describe("Project context data", () => {
    it("enriches shoot with project details when projectId exists", async () => {
      const shoot = createMockShoot({ projectId: projId });
      const { ports, projects } = createMockRepositories({
        shoots: [shoot],
        projects: [mockProject],
      });
      const service = createDashboardService(ports);

      const rows = await service.listToday(orgId, { timezone: "UTC", anchor: shoot.startsAt });

      expect(projects.list).toHaveBeenCalledWith(orgId);
      expect(rows).toHaveLength(1);
      expect(rows[0].project).toEqual(mockProject);
      expect(rows[0].project?.name).toBe("Summer Campaign");
      expect(rows[0].project?.clientName).toBe("Acme Corp");
      expect(rows[0].shoot.project).toEqual(mockProject);
    });

    it("sets project to null when shoot has no projectId", async () => {
      const shoot = createMockShoot({ projectId: null });
      const { ports } = createMockRepositories({ shoots: [shoot] });
      const service = createDashboardService(ports);

      const rows = await service.listToday(orgId, { timezone: "UTC", anchor: shoot.startsAt });

      expect(rows[0].project).toBeNull();
      expect(rows[0].shoot.project).toBeNull();
    });

    it("sets project to null when projectId does not match any existing project", async () => {
      const shoot = createMockShoot({ projectId: "00000000-0000-0000-0000-999999999999" });
      const { ports } = createMockRepositories({
        shoots: [shoot],
        projects: [mockProject],
      });
      const service = createDashboardService(ports);

      const rows = await service.listToday(orgId, { timezone: "UTC", anchor: shoot.startsAt });

      expect(rows[0].project).toBeNull();
    });
  });

  describe("Aggregate crew, equipment, checklist, and conflict data", () => {
    it("computes accurate aggregates for crew, gear, checklist completion, and conflicts", async () => {
      const shoot = createMockShoot({ id: "shoot-100" });
      const crewRows = [
        { crewMember: { id: "crew-1" } },
        { crewMember: { id: "crew-2" } },
        { crewMember: { id: "crew-3" } },
      ];
      const equipmentRows = [
        { equipmentItem: { id: "eq-1" } },
        { equipmentItem: { id: "eq-2" } },
      ];
      const checklistItems = [
        { id: "item-1", isCompleted: true },
        { id: "item-2", isCompleted: true },
        { id: "item-3", isCompleted: true },
        { id: "item-4", isCompleted: false },
      ];
      const crewConflicts: CrewConflict[] = [
        {
          shootId: "other-shoot",
          title: "Overlap 1",
          startsAt: new Date("2026-09-29T02:00:00Z"),
          endsAt: new Date("2026-09-29T05:00:00Z"),
        },
      ];
      const equipmentConflicts: EquipmentConflict[] = [
        {
          shootId: "other-shoot-2",
          title: "Overlap 2",
          startsAt: new Date("2026-09-29T03:00:00Z"),
          endsAt: new Date("2026-09-29T06:00:00Z"),
        },
      ];

      const { ports } = createMockRepositories({
        shoots: [shoot],
        crewRows,
        crewConflicts,
        equipmentRows,
        equipmentConflicts,
        checklistItems,
      });
      const service = createDashboardService(ports);

      const [result] = await service.listToday(orgId, { timezone: "UTC", anchor: shoot.startsAt });

      expect(result.crewCount).toBe(3);
      expect(result.equipmentCount).toBe(2);
      expect(result.checklistTotal).toBe(4);
      expect(result.checklistCompleted).toBe(3);
      expect(result.readinessPercent).toBe(75);
      // 3 crew members each have 1 conflict (from mock) = 3 crew conflicts
      // 2 equipment items each have 1 conflict (from mock) = 2 equipment conflicts
      expect(result.crewConflictCount).toBe(3);
      expect(result.equipmentConflictCount).toBe(2);
      expect(result.conflictCount).toBe(5);
    });

    it("handles zero checklist items with 0% readinessPercent without NaN", async () => {
      const shoot = createMockShoot({ id: "shoot-empty-checklist" });
      const { ports } = createMockRepositories({
        shoots: [shoot],
        checklistItems: [],
      });
      const service = createDashboardService(ports);

      const [result] = await service.listToday(orgId, { timezone: "UTC", anchor: shoot.startsAt });

      expect(result.checklistTotal).toBe(0);
      expect(result.checklistCompleted).toBe(0);
      expect(result.readinessPercent).toBe(0);
    });
  });

  describe("Empty state & range validation", () => {
    it("returns empty array immediately when no shoots exist today without calling child repos", async () => {
      const { ports, crewAssignments, equipmentBookings, checklists } = createMockRepositories({
        shoots: [],
      });
      const service = createDashboardService(ports);

      const rows = await service.listToday(orgId, { timezone: "UTC" });

      expect(rows).toEqual([]);
      expect(crewAssignments.listForShoot).not.toHaveBeenCalled();
      expect(equipmentBookings.listForShoot).not.toHaveBeenCalled();
      expect(checklists.listForShoot).not.toHaveBeenCalled();
    });

    it("rejects an invalid date range where endsAt <= startsAt", async () => {
      const { ports } = createMockRepositories();
      const service = createDashboardService(ports);

      const now = new Date();
      const past = new Date(now.getTime() - 10000);

      await expect(service.listRange(orgId, now, past)).rejects.toThrow(
        "Date range must end after it starts."
      );
    });
  });

  describe("Summary model (getToday)", () => {
    it("returns structured TodayDashboardSummary with total counts and shoots", async () => {
      const shoot1 = createMockShoot({ id: "shoot-1", startsAt: new Date("2026-09-29T02:00:00Z") });
      const shoot2 = createMockShoot({ id: "shoot-2", startsAt: new Date("2026-09-29T07:00:00Z") });
      const { ports } = createMockRepositories({
        shoots: [shoot1, shoot2],
        crewRows: [{ crewMember: { id: "c1" } }],
        equipmentRows: [{ equipmentItem: { id: "e1" } }],
      });
      const service = createDashboardService(ports);

      const anchor = new Date("2026-09-29T05:00:00Z");
      const summary = await service.getToday(orgId, { timezone: "Asia/Ho_Chi_Minh", anchor });

      expect(summary.timezone).toBe("Asia/Ho_Chi_Minh");
      expect(summary.anchor).toBe(anchor);
      expect(summary.range.start.toISOString()).toBe("2026-09-28T17:00:00.000Z");
      expect(summary.range.end.toISOString()).toBe("2026-09-29T17:00:00.000Z");
      expect(summary.totalShoots).toBe(2);
      expect(summary.totalCrew).toBe(2);
      expect(summary.totalEquipment).toBe(2);
      expect(summary.totalConflicts).toBe(0);
      expect(summary.totalCrewConflicts).toBe(0);
      expect(summary.totalEquipmentConflicts).toBe(0);
      expect(summary.checklistTotal).toBe(0);
      expect(summary.checklistCompleted).toBe(0);
      expect(summary.readinessPercent).toBe(0);
      expect(summary.shootsWithConflicts).toBe(0);
      expect(summary.shoots).toHaveLength(2);
    });

    it("aggregates crew vs equipment conflicts and checklist readiness accurately across shoots (M3-T07)", async () => {
      const shoot1 = createMockShoot({
        id: "shoot-conflict-crew",
        startsAt: new Date("2026-09-29T02:00:00Z"),
        endsAt: new Date("2026-09-29T05:00:00Z"),
      });
      const shoot2 = createMockShoot({
        id: "shoot-conflict-gear",
        startsAt: new Date("2026-09-29T06:00:00Z"),
        endsAt: new Date("2026-09-29T09:00:00Z"),
      });

      const { ports, crewAssignments, equipmentBookings, checklists } =
        createMockRepositories({
          shoots: [shoot1, shoot2],
        });

      // Shoot 1 has 1 crew with conflict, 0 equipment conflict, 2/2 checklist items completed
      // Shoot 2 has 0 crew with conflict, 1 equipment item with conflict, 1/3 checklist items completed
      crewAssignments.listForShoot = vi.fn(async (_orgId, sId) => {
        if (sId === "shoot-conflict-crew") return [{ crewMember: { id: "c1" } }];
        return [{ crewMember: { id: "c2" } }];
      });
      crewAssignments.findConflicts = vi.fn(async (_orgId, cId) => {
        if (cId === "c1") {
          return [
            {
              shootId: "other",
              title: "Overbooked Crew",
              startsAt: new Date("2026-09-29T02:00:00Z"),
              endsAt: new Date("2026-09-29T05:00:00Z"),
            },
          ];
        }
        return [];
      });

      equipmentBookings.listForShoot = vi.fn(async (_orgId, sId) => {
        if (sId === "shoot-conflict-crew") return [];
        return [{ equipmentItem: { id: "e1" } }];
      });
      equipmentBookings.findConflicts = vi.fn(async (_orgId, eId) => {
        if (eId === "e1") {
          return [
            {
              shootId: "other-2",
              title: "Double Booked Gear",
              startsAt: new Date("2026-09-29T06:00:00Z"),
              endsAt: new Date("2026-09-29T09:00:00Z"),
            },
          ];
        }
        return [];
      });

      checklists.listForShoot = vi.fn(async (_orgId, sId) => {
        if (sId === "shoot-conflict-crew") {
          return [
            { id: "chk-1", isCompleted: true },
            { id: "chk-2", isCompleted: true },
          ];
        }
        return [
          { id: "chk-3", isCompleted: true },
          { id: "chk-4", isCompleted: false },
          { id: "chk-5", isCompleted: false },
        ];
      });

      const service = createDashboardService(ports);
      const anchor = new Date("2026-09-29T05:00:00Z");
      const summary = await service.getToday(orgId, {
        timezone: "Asia/Ho_Chi_Minh",
        anchor,
      });

      expect(summary.totalShoots).toBe(2);
      expect(summary.totalCrewConflicts).toBe(1);
      expect(summary.totalEquipmentConflicts).toBe(1);
      expect(summary.totalConflicts).toBe(2);
      expect(summary.shootsWithConflicts).toBe(2);
      expect(summary.checklistTotal).toBe(5);
      expect(summary.checklistCompleted).toBe(3);
      expect(summary.readinessPercent).toBe(60); // 3 / 5 = 60%

      // Per-shoot verification
      expect(summary.shoots[0].crewConflictCount).toBe(1);
      expect(summary.shoots[0].equipmentConflictCount).toBe(0);
      expect(summary.shoots[0].readinessPercent).toBe(100);

      expect(summary.shoots[1].crewConflictCount).toBe(0);
      expect(summary.shoots[1].equipmentConflictCount).toBe(1);
      expect(summary.shoots[1].readinessPercent).toBe(33);
    });
  });

  describe("calculateDashboardReadiness pure logic (M3-T07)", () => {
    function createMockDashboardShoot(
      overrides?: Partial<DashboardShoot>
    ): DashboardShoot {
      const shoot = createMockShoot(overrides?.shoot ?? {});
      return {
        shoot,
        project: null,
        crewCount: 0,
        equipmentCount: 0,
        checklistTotal: 0,
        checklistCompleted: 0,
        conflictCount: 0,
        crewConflictCount: 0,
        equipmentConflictCount: 0,
        readinessPercent: 0,
        ...overrides,
      };
    }

    it("returns zero counts and 0% readiness for empty shoot list without NaN", () => {
      const summary = calculateDashboardReadiness([]);
      expect(summary).toEqual({
        totalShoots: 0,
        totalConflicts: 0,
        totalCrewConflicts: 0,
        totalEquipmentConflicts: 0,
        totalCrew: 0,
        totalEquipment: 0,
        checklistTotal: 0,
        checklistCompleted: 0,
        readinessPercent: 0,
        shootsWithConflicts: 0,
      });
    });

    it("distinguishes crew vs equipment conflicts accurately", () => {
      const shoot1 = createMockDashboardShoot({
        crewConflictCount: 2,
        equipmentConflictCount: 0,
        conflictCount: 2,
        crewCount: 3,
        equipmentCount: 2,
      });
      const shoot2 = createMockDashboardShoot({
        crewConflictCount: 0,
        equipmentConflictCount: 3,
        conflictCount: 3,
        crewCount: 1,
        equipmentCount: 4,
      });
      const shoot3 = createMockDashboardShoot({
        crewConflictCount: 1,
        equipmentConflictCount: 1,
        conflictCount: 2,
        crewCount: 2,
        equipmentCount: 1,
      });
      const shoot4 = createMockDashboardShoot({
        crewConflictCount: 0,
        equipmentConflictCount: 0,
        conflictCount: 0,
        crewCount: 2,
        equipmentCount: 2,
      });

      const summary = calculateDashboardReadiness([shoot1, shoot2, shoot3, shoot4]);

      expect(summary.totalShoots).toBe(4);
      expect(summary.totalCrewConflicts).toBe(3); // 2 + 0 + 1 + 0
      expect(summary.totalEquipmentConflicts).toBe(4); // 0 + 3 + 1 + 0
      expect(summary.totalConflicts).toBe(7);
      expect(summary.shootsWithConflicts).toBe(3); // shoot1, shoot2, shoot3
      expect(summary.totalCrew).toBe(8);
      expect(summary.totalEquipment).toBe(9);
    });

    it("summarizes checklist readiness accurately across shoots including rounding", () => {
      const shoot1 = createMockDashboardShoot({
        checklistTotal: 4,
        checklistCompleted: 3,
        readinessPercent: 75,
      });
      const shoot2 = createMockDashboardShoot({
        checklistTotal: 2,
        checklistCompleted: 1,
        readinessPercent: 50,
      });
      const shoot3 = createMockDashboardShoot({
        checklistTotal: 0,
        checklistCompleted: 0,
        readinessPercent: 0,
      });

      const summary = calculateDashboardReadiness([shoot1, shoot2, shoot3]);

      expect(summary.checklistTotal).toBe(6);
      expect(summary.checklistCompleted).toBe(4);
      // 4 / 6 = 66.666...% -> rounds to 67%
      expect(summary.readinessPercent).toBe(67);
    });

    it("returns 100% readiness when all checklist items across all shoots are completed", () => {
      const shoot1 = createMockDashboardShoot({
        checklistTotal: 3,
        checklistCompleted: 3,
        readinessPercent: 100,
      });
      const shoot2 = createMockDashboardShoot({
        checklistTotal: 5,
        checklistCompleted: 5,
        readinessPercent: 100,
      });

      const summary = calculateDashboardReadiness([shoot1, shoot2]);

      expect(summary.checklistTotal).toBe(8);
      expect(summary.checklistCompleted).toBe(8);
      expect(summary.readinessPercent).toBe(100);
      expect(summary.shootsWithConflicts).toBe(0);
    });
  });
});
