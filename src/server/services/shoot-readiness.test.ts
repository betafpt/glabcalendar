import { describe, expect, it } from "vitest";
import type { CrewConflict } from "@/server/db/crew-assignments";
import type { EquipmentConflict } from "@/server/db/equipment-bookings";
import type { Shoot } from "@/server/db/schema";
import { calculateShootReadiness } from "./shoot-readiness";

const orgId = "00000000-0000-0000-0000-000000000001";
const shootId = "00000000-0000-0000-0000-000000000010";

function createMockShoot(overrides?: Partial<Shoot>): Shoot {
  return {
    id: shootId,
    organizationId: orgId,
    projectId: null,
    title: "Commercial Shoot",
    status: "confirmed",
    startsAt: new Date("2026-10-05T09:00:00Z"),
    endsAt: new Date("2026-10-05T17:00:00Z"),
    callTime: new Date("2026-10-05T08:00:00Z"),
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

describe("Shoot readiness aggregation (M4-T05)", () => {
  describe("calculateShootReadiness pure function", () => {
    it("returns 100% readiness and ready state when checklist is complete with zero conflicts", () => {
      const shoot = createMockShoot();
      const checklistItems = [
        { id: "1", isCompleted: true, title: "Batteries charged" },
        { id: "2", isCompleted: true, title: "Location scouted" },
        { id: "3", isCompleted: true, title: "Call sheets sent" },
      ];
      const crewAssignments = [
        { crewMember: { id: "c1", name: "Alice DOP" }, conflicts: [] },
        { crewMember: { id: "c2", name: "Bob Sound" }, conflicts: [] },
      ];
      const equipmentBookings = [
        { equipmentItem: { id: "e1", name: "Cinema Camera" }, conflicts: [] },
      ];

      const result = calculateShootReadiness({
        shoot,
        checklistItems,
        crewAssignments,
        equipmentBookings,
      });

      expect(result.readinessPercent).toBe(100);
      expect(result.checklistPercent).toBe(100);
      expect(result.checklistTotal).toBe(3);
      expect(result.checklistCompleted).toBe(3);
      expect(result.crewCount).toBe(2);
      expect(result.crewConflictCount).toBe(0);
      expect(result.equipmentCount).toBe(1);
      expect(result.equipmentConflictCount).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.hasConflicts).toBe(false);
      expect(result.status).toBe("ready");
      expect(result.isReady).toBe(true);
      expect(result.isCancelled).toBe(false);
    });

    it("calculates partial readiness correctly and sets in_progress status", () => {
      const shoot = createMockShoot();
      const checklistItems = [
        { id: "1", isCompleted: true, title: "Prep lenses" },
        { id: "2", isCompleted: false, title: "Charge lighting packs" },
        { id: "3", isCompleted: false, title: "Send call sheets" },
      ];

      const result = calculateShootReadiness({
        shoot,
        checklistItems,
        crewAssignments: [{ crewMember: { id: "c1", name: "Alice" } }],
        equipmentBookings: [],
      });

      // 1 / 3 = 33.333% -> 33%
      expect(result.readinessPercent).toBe(33);
      expect(result.checklistPercent).toBe(33);
      expect(result.checklistTotal).toBe(3);
      expect(result.checklistCompleted).toBe(1);
      expect(result.status).toBe("in_progress");
      expect(result.isReady).toBe(false);
      expect(result.hasConflicts).toBe(false);
    });

    it("safely handles empty checklist without NaN or division by zero", () => {
      const shoot = createMockShoot();

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [],
        crewAssignments: [{ crewMember: { id: "c1", name: "Alice" } }],
        equipmentBookings: [{ equipmentItem: { id: "e1", name: "Camera" } }],
      });

      expect(result.readinessPercent).toBe(0);
      expect(result.checklistPercent).toBe(0);
      expect(result.checklistTotal).toBe(0);
      expect(result.checklistCompleted).toBe(0);
      expect(result.status).toBe("needs_setup");
      expect(result.isReady).toBe(false);
      expect(result.hasConflicts).toBe(false);
    });

    it("safely handles completely empty shoot (no checklist, no crew, no gear)", () => {
      const shoot = createMockShoot({ status: "planned" });

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [],
        crewAssignments: [],
        equipmentBookings: [],
      });

      expect(result.readinessPercent).toBe(0);
      expect(result.checklistTotal).toBe(0);
      expect(result.checklistCompleted).toBe(0);
      expect(result.crewCount).toBe(0);
      expect(result.equipmentCount).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.hasConflicts).toBe(false);
      expect(result.status).toBe("needs_setup");
      expect(result.isReady).toBe(false);
      expect(result.isCancelled).toBe(false);
    });

    it("marks readiness as blocked when crew conflict exists even if checklist is 100% complete", () => {
      const shoot = createMockShoot();
      const checklistItems = [
        { id: "1", isCompleted: true, title: "Item 1" },
        { id: "2", isCompleted: true, title: "Item 2" },
      ];
      const conflict: CrewConflict = {
        shootId: "other-shoot-1",
        title: "Overlapping Shoot A",
        startsAt: new Date("2026-10-05T10:00:00Z"),
        endsAt: new Date("2026-10-05T14:00:00Z"),
      };
      const crewAssignments = [
        { crewMember: { id: "c1", name: "Alice DOP" }, conflicts: [conflict] },
      ];

      const result = calculateShootReadiness({
        shoot,
        checklistItems,
        crewAssignments,
        equipmentBookings: [],
      });

      expect(result.readinessPercent).toBe(100);
      expect(result.hasConflicts).toBe(true);
      expect(result.crewConflictCount).toBe(1);
      expect(result.conflictCount).toBe(1);
      expect(result.crewConflicts).toHaveLength(1);
      expect(result.crewConflicts[0].crewMemberId).toBe("c1");
      expect(result.crewConflicts[0].crewMemberName).toBe("Alice DOP");
      expect(result.crewConflicts[0].conflicts).toEqual([conflict]);
      expect(result.status).toBe("blocked");
      expect(result.isReady).toBe(false);
    });

    it("marks readiness as blocked when equipment conflict exists", () => {
      const shoot = createMockShoot();
      const checklistItems = [{ id: "1", isCompleted: true, title: "All good" }];
      const eqConflict: EquipmentConflict = {
        shootId: "other-shoot-2",
        title: "Overlapping Shoot B",
        startsAt: new Date("2026-10-05T12:00:00Z"),
        endsAt: new Date("2026-10-05T16:00:00Z"),
      };
      const equipmentBookings = [
        { equipmentItem: { id: "e1", name: "FX3 Camera" }, conflicts: [eqConflict] },
      ];

      const result = calculateShootReadiness({
        shoot,
        checklistItems,
        crewAssignments: [],
        equipmentBookings,
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.equipmentConflictCount).toBe(1);
      expect(result.conflictCount).toBe(1);
      expect(result.equipmentConflicts[0].equipmentItemId).toBe("e1");
      expect(result.equipmentConflicts[0].equipmentItemName).toBe("FX3 Camera");
      expect(result.status).toBe("blocked");
      expect(result.isReady).toBe(false);
    });

    it("aggregates both crew and equipment conflicts accurately", () => {
      const shoot = createMockShoot();
      const crewConflict1: CrewConflict = {
        shootId: "s1",
        title: "Shoot 1",
        startsAt: new Date(),
        endsAt: new Date(),
      };
      const crewConflict2: CrewConflict = {
        shootId: "s2",
        title: "Shoot 2",
        startsAt: new Date(),
        endsAt: new Date(),
      };
      const eqConflict: EquipmentConflict = {
        shootId: "s3",
        title: "Shoot 3",
        startsAt: new Date(),
        endsAt: new Date(),
      };

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [{ id: "1", isCompleted: false, title: "TBD" }],
        crewAssignments: [
          { crewMember: { id: "c1", name: "Alice" }, conflicts: [crewConflict1, crewConflict2] },
          { crewMember: { id: "c2", name: "Bob" }, conflicts: [] },
        ],
        equipmentBookings: [
          { equipmentItem: { id: "e1", name: "Lens" }, conflicts: [eqConflict] },
        ],
      });

      expect(result.crewConflictCount).toBe(2);
      expect(result.equipmentConflictCount).toBe(1);
      expect(result.conflictCount).toBe(3);
      expect(result.hasConflicts).toBe(true);
      expect(result.status).toBe("blocked");
      expect(result.isReady).toBe(false);
    });

    it("safely handles cancelled shoots and neutralizes conflicts while preserving resource counts", () => {
      const shoot = createMockShoot({ status: "cancelled" });
      const crewConflict: CrewConflict = {
        shootId: "s1",
        title: "Shoot 1",
        startsAt: new Date(),
        endsAt: new Date(),
      };
      const eqConflict: EquipmentConflict = {
        shootId: "s2",
        title: "Shoot 2",
        startsAt: new Date(),
        endsAt: new Date(),
      };

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [
          { id: "1", isCompleted: true, title: "Task 1" },
          { id: "2", isCompleted: true, title: "Task 2" },
        ],
        crewAssignments: [
          { crewMember: { id: "c1", name: "Alice" }, conflicts: [crewConflict] },
        ],
        equipmentBookings: [
          { equipmentItem: { id: "e1", name: "Camera" }, conflicts: [eqConflict] },
        ],
      });

      expect(result.isCancelled).toBe(true);
      expect(result.status).toBe("cancelled");
      expect(result.readinessPercent).toBe(0);
      expect(result.crewCount).toBe(1);
      expect(result.equipmentCount).toBe(1);
      expect(result.crewConflictCount).toBe(0);
      expect(result.equipmentConflictCount).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.hasConflicts).toBe(false);
      expect(result.crewConflicts).toEqual([]);
      expect(result.equipmentConflicts).toEqual([]);
      expect(result.isReady).toBe(false);
    });

    it("marks readiness as blocked when shoot has 0 checklist items but has conflicts", () => {
      const shoot = createMockShoot();
      const conflict: CrewConflict = {
        shootId: "s1",
        title: "Shoot 1",
        startsAt: new Date(),
        endsAt: new Date(),
      };

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [],
        crewAssignments: [
          { crewMember: { id: "c1", name: "Alice" }, conflicts: [conflict] },
        ],
        equipmentBookings: [],
      });

      expect(result.status).toBe("blocked");
      expect(result.hasConflicts).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.readinessPercent).toBe(0);
      expect(result.isReady).toBe(false);
    });

    it("safely handles missing optional fields like crew/equipment names or undefined conflicts", () => {
      const shoot = createMockShoot();

      const result = calculateShootReadiness({
        shoot,
        checklistItems: [{ id: "1", isCompleted: true, title: "Item 1" }],
        crewAssignments: [{ crewMember: { id: "c1" } }],
        equipmentBookings: [{ equipmentItem: { id: "e1" } }],
      });

      expect(result.status).toBe("ready");
      expect(result.hasConflicts).toBe(false);
      expect(result.crewCount).toBe(1);
      expect(result.equipmentCount).toBe(1);
      expect(result.isReady).toBe(true);
    });
  });
});
