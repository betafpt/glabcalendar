import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "./interval";

const d = (hour: number) => new Date(Date.UTC(2026, 9, 1, hour));

describe("intervalsOverlap", () => {
  it("allows adjacent half-open intervals", () => {
    expect(intervalsOverlap({ startsAt: d(9), endsAt: d(10) }, { startsAt: d(10), endsAt: d(11) })).toBe(false);
  });

  it.each([
    [{ startsAt: d(9), endsAt: d(12) }, { startsAt: d(10), endsAt: d(11) }],
    [{ startsAt: d(9), endsAt: d(11) }, { startsAt: d(9), endsAt: d(11) }],
    [{ startsAt: d(9), endsAt: d(11) }, { startsAt: d(10), endsAt: d(12) }],
  ])("detects overlapping intervals", (a, b) => {
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it("allows separated intervals", () => {
    expect(intervalsOverlap({ startsAt: d(9), endsAt: d(10) }, { startsAt: d(11), endsAt: d(12) })).toBe(false);
  });
});
