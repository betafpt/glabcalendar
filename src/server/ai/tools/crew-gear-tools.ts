import type { AIContext } from "./context";
import type { CrewMember, EquipmentItem, Shoot } from "@/server/db/schema";
import { formatZonedDate, formatZonedTime } from "@/lib/zoned-datetime";
import { calculateShootReadiness } from "@/server/services/shoot-readiness";

export async function getCrewAvailabilityTool(
  ctx: AIContext,
  args: {
    date: string; // YYYY-MM-DD
    role?: string;
  }
) {
  const targetDate = new Date(args.date);
  if (Number.isNaN(targetDate.getTime())) {
    return { error: "Ngày không hợp lệ (cần định dạng YYYY-MM-DD)." };
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [allCrew, rangeAssignments] = await Promise.all([
    ctx.crewRepo.list(ctx.organizationId),
    ctx.crewAssignmentRepo.listForRange(ctx.organizationId, startOfDay, endOfDay),
  ]);

  const activeCrew = allCrew.filter((c: CrewMember) => c.status === "active");
  const filteredCrew = args.role
    ? activeCrew.filter((c: CrewMember) => (c.defaultRole || "").toLowerCase().includes(args.role!.toLowerCase()))
    : activeCrew;

  const bookedMap = new Map<string, Array<{ shootTitle?: string }>>();
  for (const item of rangeAssignments) {
    const list = bookedMap.get(item.assignment.crewMemberId) || [];
    list.push({ shootTitle: item.crewMember.name });
    bookedMap.set(item.assignment.crewMemberId, list);
  }

  const available: Array<{ id: string; name: string; role: string | null }> = [];
  const booked: Array<{ id: string; name: string; role: string | null; bookingCount: number }> = [];

  for (const member of filteredCrew) {
    const bookings = bookedMap.get(member.id);
    if (!bookings || bookings.length === 0) {
      available.push({ id: member.id, name: member.name, role: member.defaultRole });
    } else {
      booked.push({ id: member.id, name: member.name, role: member.defaultRole, bookingCount: bookings.length });
    }
  }

  return {
    date: args.date,
    totalCrew: filteredCrew.length,
    availableCount: available.length,
    bookedCount: booked.length,
    available,
    booked,
  };
}

export async function getEquipmentAvailabilityTool(
  ctx: AIContext,
  args: {
    date: string; // YYYY-MM-DD
    category?: string;
    query?: string;
  }
) {
  const targetDate = new Date(args.date);
  if (Number.isNaN(targetDate.getTime())) {
    return { error: "Ngày không hợp lệ (cần định dạng YYYY-MM-DD)." };
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [allGear, dayShoots] = await Promise.all([
    ctx.equipmentRepo.list(ctx.organizationId),
    ctx.calendarRepo.listRange(ctx.organizationId, startOfDay, endOfDay),
  ]);

  const activeShoots = dayShoots.filter((s: Shoot) => s.status !== "cancelled" && !s.isTestData);
  const shootIds = activeShoots.map((s: Shoot) => s.id);

  const dayBookings = shootIds.length > 0 ? await ctx.equipmentBookingRepo.listForShoots(ctx.organizationId, shootIds) : [];

  let activeGear = allGear.filter((g: EquipmentItem) => g.status === "available");

  if (args.category) {
    activeGear = activeGear.filter((g: EquipmentItem) => (g.category || "").toLowerCase().includes(args.category!.toLowerCase()));
  }
  if (args.query) {
    const qLower = args.query.toLowerCase();
    activeGear = activeGear.filter((g: EquipmentItem) => g.name.toLowerCase().includes(qLower) || (g.assetCode || "").toLowerCase().includes(qLower));
  }

  const bookedIds = new Set(dayBookings.map((b) => b.booking.equipmentItemId));

  const available = activeGear.filter((g: EquipmentItem) => !bookedIds.has(g.id)).map((g: EquipmentItem) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    assetCode: g.assetCode,
  }));

  const booked = activeGear.filter((g: EquipmentItem) => bookedIds.has(g.id)).map((g: EquipmentItem) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    assetCode: g.assetCode,
  }));

  return {
    date: args.date,
    totalGear: activeGear.length,
    availableCount: available.length,
    bookedCount: booked.length,
    available,
    booked,
  };
}

export async function getProjectSummaryTool(
  ctx: AIContext,
  args: {
    projectQuery: string;
  }
) {
  const qLower = args.projectQuery.toLowerCase().trim();
  const allProjects = await ctx.projectRepo.list(ctx.organizationId);

  const matched = allProjects.find(
    (p) => p.name.toLowerCase().includes(qLower) || (p.clientName || "").toLowerCase().includes(qLower) || p.id === args.projectQuery
  );

  if (!matched) {
    return { error: `Không tìm thấy dự án nào khớp với "${args.projectQuery}".` };
  }

  const shoots = await ctx.shootRepo.listForProject(ctx.organizationId, matched.id);
  const activeShoots = shoots;

  const completed = activeShoots.filter((s) => s.status === "completed").length;
  const inProgress = activeShoots.filter((s) => s.status === "in_progress").length;
  const planned = activeShoots.filter((s) => s.status === "planned" || s.status === "confirmed").length;

  return {
    project: {
      id: matched.id,
      name: matched.name,
      clientName: matched.clientName,
      status: matched.status,
      startsOn: matched.startsOn,
      endsOn: matched.endsOn,
    },
    statistics: {
      totalShoots: activeShoots.length,
      completedShoots: completed,
      inProgressShoots: inProgress,
      plannedShoots: planned,
    },
    shoots: activeShoots.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      locationName: s.locationName || "Chưa có địa điểm",
    })),
  };
}

export async function checkProductionReadinessTool(
  ctx: AIContext,
  args: {
    shootIdOrTitle: string;
  }
) {
  const query = args.shootIdOrTitle.trim();
  let shoot = await ctx.shootRepo.findById(ctx.organizationId, query);

  if (!shoot) {
    // Search by title
    const all = await ctx.calendarRepo.listRange(ctx.organizationId, new Date(Date.now() - 30 * 86400_000), new Date(Date.now() + 60 * 86400_000));
    shoot = all.find((s: Shoot) => s.title.toLowerCase().includes(query.toLowerCase())) || null;
  }

  if (!shoot) {
    return { error: `Không tìm thấy buổi quay nào khớp với "${args.shootIdOrTitle}".` };
  }

  const [checklist, crewAssignments, gearBookings] = await Promise.all([
    ctx.checklistRepo.listForShoot(ctx.organizationId, shoot.id),
    ctx.crewAssignmentRepo.listForShoot(ctx.organizationId, shoot.id),
    ctx.equipmentBookingRepo.listForShoot(ctx.organizationId, shoot.id),
  ]);

  const summary = calculateShootReadiness({
    shoot,
    checklistItems: checklist,
    crewAssignments,
    equipmentBookings: gearBookings,
  });

  const missingRequirements: string[] = [];
  if (!shoot.locationName) missingRequirements.push("Chưa có địa điểm (Location)");
  if (crewAssignments.length === 0) missingRequirements.push("Chưa phân công ekip (Crew)");
  if (gearBookings.length === 0) missingRequirements.push("Chưa đặt thiết bị (Gear)");

  return {
    shootId: shoot.id,
    title: shoot.title,
    date: formatZonedDate(shoot.startsAt, ctx.timezone),
    status: summary.status,
    readinessPercent: summary.readinessPercent,
    conflictCount: summary.conflictCount,
    hasConflicts: summary.hasConflicts,
    checklistProgress: `${summary.checklistCompleted}/${summary.checklistTotal}`,
    missingRequirements,
  };
}

export async function generateCallSheetDataTool(
  ctx: AIContext,
  args: {
    targetDate?: string; // YYYY-MM-DD
    shootIdOrTitle?: string;
  }
) {
  let matchedShoots: Shoot[] = [];

  if (args.shootIdOrTitle) {
    const q = args.shootIdOrTitle.trim();
    const byId = await ctx.shootRepo.findById(ctx.organizationId, q);
    if (byId) {
      matchedShoots = [byId];
    } else {
      const all = await ctx.calendarRepo.listRange(
        ctx.organizationId,
        new Date(Date.now() - 30 * 86400_000),
        new Date(Date.now() + 60 * 86400_000)
      );
      matchedShoots = all.filter((s: Shoot) => s.title.toLowerCase().includes(q.toLowerCase()));
    }
  } else if (args.targetDate) {
    const d = new Date(args.targetDate);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    matchedShoots = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  } else {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);
    matchedShoots = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  }

  if (matchedShoots.length === 0) {
    return {
      message: "Không tìm thấy buổi quay nào phù hợp để tạo call sheet.",
      shoots: [],
    };
  }

  const callSheets = await Promise.all(
    matchedShoots.map(async (shoot) => {
      const [crewAssignments, gearBookings] = await Promise.all([
        ctx.crewAssignmentRepo.listForShoot(ctx.organizationId, shoot.id),
        ctx.equipmentBookingRepo.listForShoot(ctx.organizationId, shoot.id),
      ]);

      let projectInfo = null;
      if (shoot.projectId) {
        const proj = await ctx.projectRepo.findById(ctx.organizationId, shoot.projectId);
        if (proj) {
          projectInfo = {
            id: proj.id,
            name: proj.name,
            clientName: proj.clientName,
          };
        }
      }

      const missingOperationalFacts: string[] = [];
      if (!shoot.locationName) missingOperationalFacts.push("Địa điểm quay (Location)");
      if (crewAssignments.length === 0) missingOperationalFacts.push("Chưa có nhân sự ekip");
      if (gearBookings.length === 0) missingOperationalFacts.push("Chưa có danh sách thiết bị");

      return {
        shootId: shoot.id,
        title: shoot.title,
        date: formatZonedDate(shoot.startsAt, ctx.timezone),
        timeRange: `${formatZonedTime(shoot.startsAt, ctx.timezone)} - ${formatZonedTime(shoot.endsAt, ctx.timezone)}`,
        location: shoot.locationName || "Chưa có địa điểm",
        project: projectInfo?.name || "Không thuộc dự án",
        client: projectInfo?.clientName || "Chưa có thông tin khách hàng",
        crew: crewAssignments.map((ca) => ({
          name: ca.crewMember.name,
          role: ca.assignment.role || ca.crewMember.defaultRole || "Thành viên ekip",
        })),
        equipment: gearBookings.map((gb) => ({
          name: gb.equipmentItem.name,
          code: gb.equipmentItem.assetCode || "",
          quantity: gb.booking.quantity,
        })),
        missingOperationalFacts,
      };
    })
  );

  return {
    totalShoots: callSheets.length,
    callSheets,
  };
}

export async function getDailyBriefTool(ctx: AIContext, args: { date?: string }) {
  const targetDate = args.date ? new Date(args.date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const shoots = await ctx.calendarRepo.listRange(ctx.organizationId, startOfDay, endOfDay);
  const formattedDate = formatZonedDate(startOfDay, ctx.timezone);

  const notices: string[] = [];

  const shootSummaries = await Promise.all(
    shoots.map(async (shoot) => {
      const [crewAssignments, gearBookings] = await Promise.all([
        ctx.crewAssignmentRepo.listForShoot(ctx.organizationId, shoot.id),
        ctx.equipmentBookingRepo.listForShoot(ctx.organizationId, shoot.id),
      ]);

      if (!shoot.locationName) {
        notices.push(`"${shoot.title}" chưa có địa điểm quay.`);
      }
      if (crewAssignments.length === 0) {
        notices.push(`"${shoot.title}" chưa phân công ekip.`);
      }

      return {
        id: shoot.id,
        title: shoot.title,
        status: shoot.status,
        time: `${formatZonedTime(shoot.startsAt, ctx.timezone)} - ${formatZonedTime(shoot.endsAt, ctx.timezone)}`,
        location: shoot.locationName || "Chưa có địa điểm",
        crewCount: crewAssignments.length,
        gearCount: gearBookings.length,
      };
    })
  );

  return {
    date: formattedDate,
    totalShoots: shoots.length,
    shoots: shootSummaries,
    notices,
  };
}
