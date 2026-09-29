import { describe, expect, it } from "vitest";
import { calendarRange } from "./calendar-range";

describe("calendarRange", () => {
  it("uses the organization timezone for a local day", () => {
    const range = calendarRange("day", new Date("2026-09-29T05:00:00Z"), "Asia/Ho_Chi_Minh");
    expect(range.start.toISOString()).toBe("2026-09-28T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-29T17:00:00.000Z");
  });
});
