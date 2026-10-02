import { describe, expect, it } from "vitest";

/**
 * Pure conflict detection logic mirroring the SQL condition in:
 * - src/server/db/crew-assignments.ts
 * - src/server/db/equipment-bookings.ts
 *
 * SQL:
 *   ne(shoots.id, targetShootId)
 *   ne(shoots.status, "cancelled")
 *   lt(shoots.startsAt, endsAt)
 *   gt(shoots.endsAt, startsAt)
 */
export function hasScheduleConflict(
  existing: { id: string; status: string; startsAt: Date; endsAt: Date },
  target: { id: string; startsAt: Date; endsAt: Date }
): boolean {
  if (existing.id === target.id) return false;
  if (existing.status === "cancelled") return false;
  return existing.startsAt < target.endsAt && existing.endsAt > target.startsAt;
}

describe("Conflict Rules (TASKS.md LIVE-01 Gate)", () => {
  const baseDate = new Date("2026-09-30T00:00:00Z");

  const createTimes = (startHour: number, endHour: number) => ({
    startsAt: new Date(baseDate.getTime() + startHour * 3600_000),
    endsAt: new Date(baseDate.getTime() + endHour * 3600_000),
  });

  describe("Adjacent bookings", () => {
    it("allows adjacent bookings when existing shoot ends exactly when target shoot starts", () => {
      const existing = {
        id: "shoot-1",
        status: "confirmed",
        ...createTimes(9, 13), // 09:00 - 13:00
      };
      const target = {
        id: "shoot-2",
        ...createTimes(13, 17), // 13:00 - 17:00 (adjacent at 13:00)
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(false);
    });

    it("allows adjacent bookings when target shoot ends exactly when existing shoot starts", () => {
      const existing = {
        id: "shoot-1",
        status: "confirmed",
        ...createTimes(13, 17), // 13:00 - 17:00
      };
      const target = {
        id: "shoot-2",
        ...createTimes(9, 13), // 09:00 - 13:00 (adjacent at 13:00)
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(false);
    });
  });

  describe("Overlapping active bookings", () => {
    it("rejects overlapping active bookings when target starts before existing ends", () => {
      const existing = {
        id: "shoot-1",
        status: "confirmed",
        ...createTimes(9, 13), // 09:00 - 13:00
      };
      const target = {
        id: "shoot-2",
        ...createTimes(12, 15), // 12:00 - 15:00 (overlaps 12:00 - 13:00)
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(true);
    });

    it("rejects overlapping active bookings when target is completely within existing shoot", () => {
      const existing = {
        id: "shoot-1",
        status: "planned",
        ...createTimes(8, 18), // 08:00 - 18:00
      };
      const target = {
        id: "shoot-2",
        ...createTimes(10, 14), // 10:00 - 14:00 (enclosed)
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(true);
    });

    it("rejects overlapping active bookings when target completely encloses existing shoot", () => {
      const existing = {
        id: "shoot-1",
        status: "confirmed",
        ...createTimes(10, 14),
      };
      const target = {
        id: "shoot-2",
        ...createTimes(8, 18),
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(true);
    });
  });

  describe("Status filtering and self-exclusion", () => {
    it("ignores overlapping bookings when existing shoot is cancelled", () => {
      const existing = {
        id: "shoot-1",
        status: "cancelled",
        ...createTimes(9, 13),
      };
      const target = {
        id: "shoot-2",
        ...createTimes(10, 12),
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(false);
    });

    it("ignores the shoot itself (same ID)", () => {
      const existing = {
        id: "shoot-1",
        status: "confirmed",
        ...createTimes(9, 13),
      };
      const target = {
        id: "shoot-1",
        ...createTimes(9, 13),
      };

      const conflict = hasScheduleConflict(existing, target);
      expect(conflict).toBe(false);
    });
  });
});
