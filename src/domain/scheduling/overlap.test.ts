import { describe, expect, it } from "vitest";
import {
  areIntervalsAdjacent,
  areIntervalsOverlapping,
  type TimeInterval,
} from "./overlap";

describe("Half-open interval overlap logic (M2-T01)", () => {
  const shootA: TimeInterval = {
    startsAt: new Date("2026-10-05T09:00:00Z"),
    endsAt: new Date("2026-10-05T13:00:00Z"),
  };

  describe("Adjacent bookings (allowed by scheduling rules)", () => {
    it("allows a booking that starts exactly when another ends", () => {
      const adjacentAfter: TimeInterval = {
        startsAt: new Date("2026-10-05T13:00:00Z"),
        endsAt: new Date("2026-10-05T17:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, adjacentAfter)).toBe(false);
      expect(areIntervalsAdjacent(shootA, adjacentAfter)).toBe(true);
    });

    it("allows a booking that ends exactly when another starts", () => {
      const adjacentBefore: TimeInterval = {
        startsAt: new Date("2026-10-05T05:00:00Z"),
        endsAt: new Date("2026-10-05T09:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, adjacentBefore)).toBe(false);
      expect(areIntervalsAdjacent(shootA, adjacentBefore)).toBe(true);
    });
  });

  describe("Overlapping bookings (rejected as scheduling conflict)", () => {
    it("detects partial overlap when next shoot starts 1 minute before current ends", () => {
      const partialOverlap: TimeInterval = {
        startsAt: new Date("2026-10-05T12:59:00Z"),
        endsAt: new Date("2026-10-05T17:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, partialOverlap)).toBe(true);
    });

    it("detects partial overlap when previous shoot ends 1 minute after current starts", () => {
      const partialOverlap: TimeInterval = {
        startsAt: new Date("2026-10-05T07:00:00Z"),
        endsAt: new Date("2026-10-05T09:01:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, partialOverlap)).toBe(true);
    });

    it("detects identical intervals as overlapping", () => {
      const identical: TimeInterval = {
        startsAt: new Date("2026-10-05T09:00:00Z"),
        endsAt: new Date("2026-10-05T13:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, identical)).toBe(true);
    });

    it("detects nested interval where B is completely inside A", () => {
      const nestedInside: TimeInterval = {
        startsAt: new Date("2026-10-05T10:00:00Z"),
        endsAt: new Date("2026-10-05T12:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, nestedInside)).toBe(true);
      expect(areIntervalsOverlapping(nestedInside, shootA)).toBe(true);
    });

    it("detects enveloping interval where B completely encloses A", () => {
      const enclosing: TimeInterval = {
        startsAt: new Date("2026-10-05T07:00:00Z"),
        endsAt: new Date("2026-10-05T15:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, enclosing)).toBe(true);
    });
  });

  describe("Non-overlapping disjoint intervals", () => {
    it("returns false for shoots on different days or hours apart", () => {
      const laterThatDay: TimeInterval = {
        startsAt: new Date("2026-10-05T14:00:00Z"),
        endsAt: new Date("2026-10-05T18:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, laterThatDay)).toBe(false);
      expect(areIntervalsAdjacent(shootA, laterThatDay)).toBe(false);
    });

    it("supports string and timestamp inputs seamlessly", () => {
      const stringInterval: TimeInterval = {
        startsAt: "2026-10-05T10:00:00Z",
        endsAt: "2026-10-05T14:00:00Z",
      };

      expect(areIntervalsOverlapping(shootA, stringInterval)).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("returns false if interval duration is zero or negative", () => {
      const zeroDuration: TimeInterval = {
        startsAt: new Date("2026-10-05T10:00:00Z"),
        endsAt: new Date("2026-10-05T10:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, zeroDuration)).toBe(false);

      const negativeDuration: TimeInterval = {
        startsAt: new Date("2026-10-05T12:00:00Z"),
        endsAt: new Date("2026-10-05T10:00:00Z"),
      };

      expect(areIntervalsOverlapping(shootA, negativeDuration)).toBe(false);
    });
  });
});
