import { describe, expect, it } from "vitest";
import { queryScheduleTool, findEventsTool, findFreeSlotsTool } from "./tools/schedule-tools";
import { checkConflictsTool, checkMissingInfoTool } from "./tools/conflict-tools";
import {
  getCrewAvailabilityTool,
  getEquipmentAvailabilityTool,
  getProjectSummaryTool,
  checkProductionReadinessTool,
  generateCallSheetDataTool,
  getDailyBriefTool,
} from "./tools/crew-gear-tools";
import {
  createShootProposal,
  createMoveShootProposal,
  createBulkMoveProposal,
  cancelProposal,
  executeConfirmedProposal,
} from "./actions/proposals";
import type { AIContext } from "./tools/context";

// Create mock AI context for testing deterministic behavior
function createMockAIContext(): AIContext {
  const baseDate = new Date("2026-10-10T09:00:00Z");

  const shootsList = [
    {
      id: "shoot-1",
      organizationId: "org-1",
      projectId: "proj-1",
      title: "VinFast Campaign Shoot",
      status: "confirmed",
      startsAt: new Date("2026-10-10T08:00:00Z"),
      endsAt: new Date("2026-10-10T12:00:00Z"),
      callTime: new Date("2026-10-10T07:30:00Z"),
      locationName: "Studio M",
      locationAddress: "123 Đường A",
      notes: "Quay TVC VinFast",
      syncPolicy: "local_only" as const,
      isTestData: false,
      sourceCalendarId: null,
      externalEventId: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: "shoot-2",
      organizationId: "org-1",
      projectId: "proj-2",
      title: "Nike Social Video",
      status: "planned",
      startsAt: new Date("2026-10-11T13:00:00Z"),
      endsAt: new Date("2026-10-11T17:00:00Z"),
      callTime: null,
      locationName: null, // missing location!
      notes: null,
      syncPolicy: "local_only" as const,
      isTestData: false,
      sourceCalendarId: null,
      externalEventId: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  const projectsList = [
    {
      id: "proj-1",
      organizationId: "org-1",
      name: "VinFast Autumn Campaign",
      clientName: "VinFast",
      status: "in_progress",
      startsOn: "2026-10-01",
      endsOn: "2026-10-30",
      notes: null,
      coverImageUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: "proj-2",
      organizationId: "org-1",
      name: "Nike Training Social",
      clientName: "Nike",
      status: "planned",
      startsOn: "2026-10-05",
      endsOn: "2026-10-25",
      notes: null,
      coverImageUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  const crewList = [
    {
      id: "crew-1",
      organizationId: "org-1",
      name: "Nam Nguyễn",
      defaultRole: "Đạo diễn",
      phone: null,
      email: null,
      status: "active",
      notes: null,
      avatarDataUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: "crew-2",
      organizationId: "org-1",
      name: "Linh Trần",
      defaultRole: "DOP",
      phone: null,
      email: null,
      status: "active",
      notes: null,
      avatarDataUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  const gearList = [
    {
      id: "gear-1",
      organizationId: "org-1",
      name: "Sony FX3 Cinema",
      category: "Camera",
      assetCode: "FX3-01",
      serialNumber: "SN123",
      status: "available",
      notes: null,
      imageDataUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  return {
    organizationId: "org-1",
    timezone: "Asia/Ho_Chi_Minh",
    shootRepo: {
      findById: async (_: any, id: any) => shootsList.find((s) => s.id === id) as any,
      list: async () => shootsList as any,
      listForProject: async () => shootsList as any,
      create: async (input: any) => {
        const item = { id: "new-shoot-id", ...input } as any;
        shootsList.push(item);
        return item;
      },
      update: async (_: any, id: any, patch: any) => {
        const idx = shootsList.findIndex((s) => s.id === id);
        if (idx >= 0) {
          shootsList[idx] = { ...shootsList[idx], ...patch } as any;
          return shootsList[idx] as any;
        }
        return null;
      },
    } as any,
    calendarRepo: {
      listRange: async () => shootsList as any,
    } as any,
    projectRepo: {
      list: async () => projectsList as any,
      findById: async (_: any, id: any) => projectsList.find((p) => p.id === id) || null,
    } as any,
    crewRepo: {
      list: async () => crewList as any,
    } as any,
    crewAssignmentRepo: {
      listForShoots: async () => [],
      listForShoot: async () => [],
      listForRange: async () => [],
      findConflicts: async () => [],
      create: async (i: any) => i as any,
    } as any,
    equipmentRepo: {
      list: async () => gearList as any,
    } as any,
    equipmentBookingRepo: {
      listForShoots: async () => [],
      listForShoot: async () => [],
      listForRange: async () => [],
      findConflicts: async () => [],
      create: async (i: any) => i as any,
    } as any,
    checklistRepo: {
      listForShoot: async () => [],
    } as any,
    dashboardService: {} as any,
  };
}

describe("AI Read-Only Tools (Phase 2)", () => {
  it("queryScheduleTool retrieves shoots with project context", async () => {
    const ctx = createMockAIContext();
    const res = await queryScheduleTool(ctx, {
      startDate: "2026-10-09",
      endDate: "2026-10-12",
    });

    expect(res.totalShoots).toBe(2);
    expect(res.shoots?.[0]?.title).toBe("VinFast Campaign Shoot");
    expect(res.shoots?.[0]?.clientName).toBe("VinFast");
  });

  it("findEventsTool searches shoots by keyword", async () => {
    const ctx = createMockAIContext();
    const res = await findEventsTool(ctx, { query: "VinFast" });

    expect(res.totalFound).toBe(1);
    expect(res.shoots?.[0]?.title).toContain("VinFast");
  });

  it("findFreeSlotsTool finds available slots between work hours", async () => {
    const ctx = createMockAIContext();
    const res = await findFreeSlotsTool(ctx, {
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      durationHours: 4,
    });

    expect(res.totalSlotsFound).toBeGreaterThan(0);
    expect(res.slots?.[0]?.durationHours).toBe(4);
  });

  it("checkMissingInfoTool identifies missing location and call time", async () => {
    const ctx = createMockAIContext();
    const res = await checkMissingInfoTool(ctx, {});

    expect(res.shootsWithMissingInfo).toBeGreaterThan(0);
    const nikeIssue = res.issues.find((i) => i.title.includes("Nike"));
    expect(nikeIssue).toBeDefined();
    expect(nikeIssue?.missingFields).toContain("Địa điểm (Location)");
  });
});

describe("AI Mutation Proposal Gate & Zero-Mutation Cancel (Phase 4, 5)", () => {
  it("creates structured shoot proposal without mutating the database", async () => {
    const ctx = createMockAIContext();
    const proposal = await createShootProposal(ctx, {
      originalRequest: "Tạo lịch quay VinFast thứ Sáu từ 8h đến 17h ở Studio M",
      title: "VinFast Social Reel",
      startsAt: new Date("2026-10-16T08:00:00Z"),
      endsAt: new Date("2026-10-16T17:00:00Z"),
      locationName: "Studio M",
      projectNameOrClient: "VinFast",
      crewMemberNames: ["Nam"],
      equipmentNames: ["FX3"],
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.requiresConfirmation).toBe(true);
    expect(proposal.actionType).toBe("create_shoot");
    expect(proposal.diff.length).toBeGreaterThanOrEqual(3);

    // Verify database was NOT mutated before confirmation
    const shootsBefore: any[] = await ctx.calendarRepo.listRange(ctx.organizationId, new Date(0), new Date(Date.now() + 1000000000));
    expect(shootsBefore.some((s: any) => s.title === "VinFast Social Reel")).toBe(false);
  });

  it("cancelProposal causes ZERO mutations in database", async () => {
    const ctx = createMockAIContext();
    const proposal = await createShootProposal(ctx, {
      originalRequest: "Tạo lịch quay VinFast",
      title: "Cancelled Shoot Test",
      startsAt: new Date("2026-10-20T08:00:00Z"),
      endsAt: new Date("2026-10-20T12:00:00Z"),
    });

    const cancelRes = await cancelProposal(ctx, proposal.id);
    expect(cancelRes.ok).toBe(true);

    const shoots: any[] = await ctx.calendarRepo.listRange(ctx.organizationId, new Date(0), new Date(Date.now() + 1000000000));
    expect(shoots.some((s: any) => s.title === "Cancelled Shoot Test")).toBe(false);
  });

  it("executeConfirmedProposal creates shoot ONLY after explicit confirmation", async () => {
    const ctx = createMockAIContext();
    const proposal = await createShootProposal(ctx, {
      originalRequest: "Tạo lịch quay VinFast xác nhận",
      title: "Confirmed Shoot",
      startsAt: new Date("2026-10-22T08:00:00Z"),
      endsAt: new Date("2026-10-22T12:00:00Z"),
      locationName: "ROMRA Studio",
    });

    const execRes = await executeConfirmedProposal(ctx, proposal.id);
    expect(execRes.ok).toBe(true);
    expect(execRes.shootId).toBeDefined();

    const shootsAfter: any[] = await ctx.calendarRepo.listRange(ctx.organizationId, new Date(0), new Date(Date.now() + 1000000000));
    expect(shootsAfter.some((s: any) => s.title === "Confirmed Shoot")).toBe(true);
  });

  it("createMoveShootProposal generates diff without mutating", async () => {
    const ctx = createMockAIContext();
    const proposal = await createMoveShootProposal(ctx, {
      originalRequest: "Dời buổi VinFast sang thứ Bảy",
      shootIdOrTitle: "VinFast",
      newStartsAt: new Date("2026-10-17T09:00:00Z"),
      newEndsAt: new Date("2026-10-17T13:00:00Z"),
      newLocationName: "ROMRA Studio",
    });

    expect(proposal.actionType).toBe("move_shoot");
    expect(proposal.requiresConfirmation).toBe(true);
    const dateDiff = proposal.diff.find((d) => d.field === "date");
    expect(dateDiff?.oldValue).toBeDefined();
    expect(dateDiff?.newValue).toBeDefined();
  });
});

describe("AI Crew, Gear, Readiness, Project, Call Sheet Tools (Phase 6 - 13)", () => {
  it("getCrewAvailabilityTool retrieves crew status and respects role filter", async () => {
    const ctx = createMockAIContext();
    const resAll = await getCrewAvailabilityTool(ctx, { date: "2026-10-10" });
    expect(resAll.totalCrew).toBe(2);
    expect(resAll.availableCount).toBe(2);

    const resDirector = await getCrewAvailabilityTool(ctx, { date: "2026-10-10", role: "Đạo diễn" });
    expect(resDirector.totalCrew).toBe(1);
    expect(resDirector.available).toBeDefined();
    expect(resDirector.available![0].name).toBe("Nam Nguyễn");
  });

  it("getEquipmentAvailabilityTool checks equipment availability and category", async () => {
    const ctx = createMockAIContext();
    const res = await getEquipmentAvailabilityTool(ctx, { date: "2026-10-10", query: "FX3" });
    expect(res.totalGear).toBe(1);
    expect(res.available).toBeDefined();
    expect(res.available![0].name).toBe("Sony FX3 Cinema");
    expect(res.availableCount).toBe(1);
  });

  it("checkProductionReadinessTool calculates readiness and flags missing requirements", async () => {
    const ctx = createMockAIContext();
    // shoot-2 lacks location, crew, gear
    const res = await checkProductionReadinessTool(ctx, { shootIdOrTitle: "shoot-2" });
    expect(res.title).toBe("Nike Social Video");
    expect(res.readinessPercent).toBeDefined();
    expect(res.missingRequirements).toBeDefined();
    expect(res.missingRequirements!.length).toBeGreaterThanOrEqual(2);
  });

  it("getProjectSummaryTool summarizes project shoots and progress", async () => {
    const ctx = createMockAIContext();
    const res = await getProjectSummaryTool(ctx, { projectQuery: "VinFast" });
    expect(res.project).toBeDefined();
    expect(res.statistics).toBeDefined();
    expect(res.project!.name).toBe("VinFast Autumn Campaign");
    expect(res.statistics!.totalShoots).toBeGreaterThanOrEqual(1);
  });

  it("generateCallSheetDataTool extracts shoot details and flags missing operational facts", async () => {
    const ctx = createMockAIContext();
    const res = await generateCallSheetDataTool(ctx, { shootIdOrTitle: "shoot-2" });
    expect(res.totalShoots).toBe(1);
    expect(res.callSheets).toBeDefined();
    expect(res.callSheets![0].missingOperationalFacts).toContain("Địa điểm quay (Location)");
  });

  it("getDailyBriefTool provides summary and notices for today's shoots", async () => {
    const ctx = createMockAIContext();
    const res = await getDailyBriefTool(ctx, { date: "2026-10-10" });
    expect(res.totalShoots).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.notices)).toBe(true);
  });

  it("createBulkMoveProposal generates diff for all matching shoots and updates them on confirmation", async () => {
    const ctx = createMockAIContext();
    const proposal = await createBulkMoveProposal(ctx, {
      originalRequest: "Dời toàn bộ SHOOT của VinFast tuần này sang tuần sau",
      projectNameOrQuery: "VinFast",
      daysShift: 7,
    });

    expect(proposal.actionType).toBe("bulk_move_shoots");
    expect(proposal.diff.length).toBeGreaterThanOrEqual(1);
    expect(proposal.requiresConfirmation).toBe(true);

    const execRes = await executeConfirmedProposal(ctx, proposal.id);
    expect(execRes.ok).toBe(true);
    expect(execRes.message).toContain("Đã dời thành công");
  });
});
