import { describe, it, expect } from "vitest";
import {
  normalizeSearchText,
  calendarCommandFilter,
} from "./calendar-command-search";

describe("Calendar Command Search Filtering", () => {
  it("normalizes Vietnamese text and diacritics correctly", () => {
    expect(normalizeSearchText("Gụ")).toBe("gu");
    expect(normalizeSearchText("Buổi quay SI DINING")).toBe("buoi quay si dining");
    expect(normalizeSearchText("Đà Nẵng")).toBe("da nang");
    expect(normalizeSearchText("  Hoàng   Nam  ")).toBe("hoang nam");
  });

  it("query 'SI DINING' must NOT match event 'Gụ'", () => {
    const guEventValue = "Gụ Nội bộ Studio A Nguyễn Văn B";
    const score = calendarCommandFilter(guEventValue, "SI DINING");
    expect(score).toBe(0);
  });

  it("query 'SI DINING' matches shoot with title containing 'SI DINING'", () => {
    const siDiningShoot = "TVC SI DINING Khách hàng F&B Hà Nội Lê Văn C";
    const score = calendarCommandFilter(siDiningShoot, "SI DINING");
    expect(score).toBeGreaterThan(0);
  });

  it("query 'SI DINING' matches shoot where project is 'SI DINING'", () => {
    const shootWithProject = "Khai trương chi nhánh SI DINING Quận 1";
    const score = calendarCommandFilter(shootWithProject, "SI DINING");
    expect(score).toBeGreaterThan(0);
  });

  it("query 'SI DINING' matches shoot where location is 'SI DINING'", () => {
    const shootWithLocation = "Chụp lookbook Xuân Hè Boutique SI DINING Restaurant";
    const score = calendarCommandFilter(shootWithLocation, "SI DINING");
    expect(score).toBeGreaterThan(0);
  });

  it("query 'SI DINING' matches shoot where crew member is 'SI DINING'", () => {
    const shootWithCrew = "Quay phỏng vấn G.Lab Studio Si Dining Director";
    const score = calendarCommandFilter(shootWithCrew, "SI DINING");
    expect(score).toBeGreaterThan(0);
  });

  it("query 'gu' matches 'Gụ' and 'Tiệc Gụ'", () => {
    expect(calendarCommandFilter("Gụ Studio A", "gu")).toBeGreaterThan(0);
    expect(calendarCommandFilter("Tiệc tất niên Gụ", "gụ")).toBeGreaterThan(0);
  });

  it("query with multiple words requires ALL words to match (AND semantics)", () => {
    // Only "SI" matches, "DINING" does not match -> should return 0
    const partialMatch = "Quay phóng sự SI Media Hà Nội";
    expect(calendarCommandFilter(partialMatch, "SI DINING")).toBe(0);
  });

  it("empty search query returns positive score", () => {
    expect(calendarCommandFilter("Any shoot title", "")).toBe(1);
    expect(calendarCommandFilter("Any shoot title", "   ")).toBe(1);
  });
});
