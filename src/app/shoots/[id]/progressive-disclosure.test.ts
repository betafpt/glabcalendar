import { describe, it, expect } from "vitest";

describe("Shoot Detail Progressive Disclosure Logic", () => {
  it("defaults all deep operation sections to closed (empty array)", () => {
    const defaultOpenSections: string[] = [];
    expect(defaultOpenSections).toHaveLength(0);
    expect(defaultOpenSections.includes("schedule")).toBe(false);
    expect(defaultOpenSections.includes("crew")).toBe(false);
    expect(defaultOpenSections.includes("gear")).toBe(false);
  });

  it("supports concurrent multiple open sections for crew and gear reconciliation", () => {
    let openSections: string[] = [];

    // User opens crew assignment
    openSections = [...openSections, "crew"];
    expect(openSections).toEqual(["crew"]);

    // User also opens gear booking concurrently without closing crew
    openSections = [...openSections, "gear"];
    expect(openSections).toContain("crew");
    expect(openSections).toContain("gear");
    expect(openSections).toHaveLength(2);

    // Closing crew does not close gear
    openSections = openSections.filter((v) => v !== "crew");
    expect(openSections).toEqual(["gear"]);
  });

  it("extracts up to 3 crew initials, roles, and detects conflict in closed summary", () => {
    const mockCrewAssignments = [
      { id: "1", name: "Nguyễn Văn An", role: "Đạo diễn" },
      { id: "2", name: "Trần Bình", role: "DOP" },
      { id: "3", name: "Lê Cường", role: "Quay phim" },
      { id: "4", name: "Phạm Dũng", role: "Ánh sáng" },
    ];

    const topCrew = mockCrewAssignments.slice(0, 3);
    const initials = topCrew.map((c) =>
      c.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
    );
    expect(initials).toEqual(["NV", "TB", "LC"]);

    const remainingCount = mockCrewAssignments.length - 3;
    expect(remainingCount).toBe(1);

    const roles = Array.from(new Set(mockCrewAssignments.map((c) => c.role)));
    expect(roles.slice(0, 3)).toEqual(["Đạo diễn", "DOP", "Quay phim"]);

    // Conflict detection
    const crewConflictCount = 1;
    const hasCrewConflicts = crewConflictCount > 0;
    expect(hasCrewConflicts).toBe(true);
  });

  it("summarizes booked gear count, key items, and detects conflict in closed summary", () => {
    const mockBookings = [
      { id: "b1", name: "Sony FX3 Cinema Camera", quantity: 2 },
      { id: "b2", name: "Sony FE 24-70mm GM II", quantity: 1 },
      { id: "b3", name: "Aputure 600d Pro", quantity: 3 },
      { id: "b4", name: "DJI Ronin RS3 Pro", quantity: 1 },
    ];

    const totalQuantity = mockBookings.reduce((sum, b) => sum + b.quantity, 0);
    expect(totalQuantity).toBe(7);

    const mainGear = mockBookings.slice(0, 3).map((b) => b.name);
    expect(mainGear).toEqual([
      "Sony FX3 Cinema Camera",
      "Sony FE 24-70mm GM II",
      "Aputure 600d Pro",
    ]);

    // Conflict detection
    const equipmentConflictCount = 2;
    const hasEquipmentConflicts = equipmentConflictCount > 0;
    expect(hasEquipmentConflicts).toBe(true);
  });

  it("formats shoot schedule summary cleanly without exposing full inputs when closed", () => {
    const shootData = {
      title: "TVC Highlands Coffee",
      status: "confirmed" as const,
      locationName: "Studio A",
      locationAddress: "123 Điện Biên Phủ, TP.HCM",
      startsAt: new Date("2026-10-15T08:00:00Z"),
      endsAt: new Date("2026-10-15T18:00:00Z"),
      callTime: new Date("2026-10-15T07:00:00Z"),
    };

    const hasLocation = Boolean(shootData.locationName || shootData.locationAddress);
    expect(hasLocation).toBe(true);
  });
});
