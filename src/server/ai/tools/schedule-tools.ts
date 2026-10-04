import type { AIContext } from "./context";
import type { Shoot } from "@/server/db/schema";
import { formatZonedDate } from "@/lib/zoned-datetime";

export async function queryScheduleTool(
  ctx: AIContext,
  args: {
    startDate: string; // ISO string or YYYY-MM-DD
    endDate: string;   // ISO string or YYYY-MM-DD
    query?: string;
  }
) {
  const start = new Date(args.startDate);
  const end = new Date(args.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Ngày bắt đầu hoặc kết thúc không hợp lệ (cần định dạng YYYY-MM-DD hoặc ISO)." };
  }

  const rawShoots: Shoot[] = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  const projects = await ctx.projectRepo.list(ctx.organizationId);
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Filter excluded or test data by default
  const activeShoots = rawShoots.filter((s: Shoot) => !s.isTestData && s.syncPolicy !== "excluded");

  const results = activeShoots.map((s: Shoot) => {
    const proj = s.projectId ? projectMap.get(s.projectId) : null;
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      dateLocal: formatZonedDate(s.startsAt, ctx.timezone),
      locationName: s.locationName || "Chưa có địa điểm",
      projectName: proj?.name || null,
      clientName: proj?.clientName || null,
    };
  });

  return {
    totalShoots: results.length,
    startDate: args.startDate,
    endDate: args.endDate,
    shoots: results,
  };
}

export async function findEventsTool(
  ctx: AIContext,
  args: {
    query: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const queryLower = args.query.trim().toLowerCase();
  const start = args.startDate ? new Date(args.startDate) : new Date(Date.now() - 30 * 86400_000);
  const end = args.endDate ? new Date(args.endDate) : new Date(Date.now() + 60 * 86400_000);

  const rawShoots: Shoot[] = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  const projects = await ctx.projectRepo.list(ctx.organizationId);
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const matched = rawShoots.filter((s: Shoot) => {
    if (s.isTestData || s.syncPolicy === "excluded") return false;
    const proj = s.projectId ? projectMap.get(s.projectId) : null;
    const inTitle = s.title.toLowerCase().includes(queryLower);
    const inProject = proj ? proj.name.toLowerCase().includes(queryLower) || (proj.clientName || "").toLowerCase().includes(queryLower) : false;
    const inLocation = (s.locationName || "").toLowerCase().includes(queryLower);
    return inTitle || inProject || inLocation;
  });

  return {
    query: args.query,
    totalFound: matched.length,
    shoots: matched.map((s: Shoot) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      dateLocal: formatZonedDate(s.startsAt, ctx.timezone),
      locationName: s.locationName || null,
      projectName: s.projectId ? projectMap.get(s.projectId)?.name || null : null,
    })),
  };
}

export async function findFreeSlotsTool(
  ctx: AIContext,
  args: {
    startDate: string;
    endDate: string;
    durationHours?: number; // e.g. 4
    workStartHour?: number; // default 8
    workEndHour?: number;   // default 18
  }
) {
  const start = new Date(args.startDate);
  const end = new Date(args.endDate);
  const duration = (args.durationHours || 4) * 3600_000;
  const workStart = args.workStartHour ?? 8;
  const workEnd = args.workEndHour ?? 18;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Khoảng thời gian không hợp lệ." };
  }

  const existingShoots: Shoot[] = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  const activeShoots = existingShoots.filter((s: Shoot) => s.status !== "cancelled" && !s.isTestData);

  const freeSlots: Array<{ startsAt: string; endsAt: string; date: string; durationHours: number }> = [];

  // Iterate day by day
  const curr = new Date(start);
  curr.setHours(0, 0, 0, 0);

  while (curr < end && freeSlots.length < 10) {
    const dayStart = new Date(curr);
    dayStart.setHours(workStart, 0, 0, 0);

    const dayEnd = new Date(curr);
    dayEnd.setHours(workEnd, 0, 0, 0);

    // Get shoots on this day
    const dayShoots = activeShoots
      .filter((s: Shoot) => s.startsAt < dayEnd && s.endsAt > dayStart)
      .sort((a: Shoot, b: Shoot) => a.startsAt.getTime() - b.startsAt.getTime());

    let windowStart = dayStart.getTime();

    for (const shoot of dayShoots) {
      const shootStart = Math.max(shoot.startsAt.getTime(), dayStart.getTime());
      if (shootStart - windowStart >= duration) {
        freeSlots.push({
          startsAt: new Date(windowStart).toISOString(),
          endsAt: new Date(windowStart + duration).toISOString(),
          date: formatZonedDate(new Date(windowStart), ctx.timezone),
          durationHours: args.durationHours || 4,
        });
      }
      windowStart = Math.max(windowStart, shoot.endsAt.getTime());
    }

    if (dayEnd.getTime() - windowStart >= duration) {
      freeSlots.push({
        startsAt: new Date(windowStart).toISOString(),
        endsAt: new Date(windowStart + duration).toISOString(),
        date: formatZonedDate(new Date(windowStart), ctx.timezone),
        durationHours: args.durationHours || 4,
      });
    }

    // Advance 1 day
    curr.setDate(curr.getDate() + 1);
  }

  return {
    durationHours: args.durationHours || 4,
    totalSlotsFound: freeSlots.length,
    slots: freeSlots,
  };
}
