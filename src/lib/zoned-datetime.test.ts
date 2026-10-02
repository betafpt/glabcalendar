import { describe, expect, it } from "vitest";
import { formatDateTimeLocal, zonedDateTimeLocalToIso } from "./zoned-datetime";

describe("zoned datetime-local helpers", () => {
  it("formats a stored instant in the configured application timezone", () => {
    expect(formatDateTimeLocal(new Date("2026-10-02T07:00:00.000Z"), "Asia/Ho_Chi_Minh"))
      .toBe("2026-10-02T14:00");
  });

  it("converts a datetime-local value to the correct instant", () => {
    expect(zonedDateTimeLocalToIso("2026-10-02T14:00", "Asia/Ho_Chi_Minh"))
      .toBe("2026-10-02T07:00:00.000Z");
  });

  it("round-trips without shifting the stored instant", () => {
    const original = new Date("2026-10-02T07:00:00.000Z");
    const local = formatDateTimeLocal(original, "Asia/Ho_Chi_Minh");
    expect(zonedDateTimeLocalToIso(local, "Asia/Ho_Chi_Minh")).toBe(original.toISOString());
  });
});
