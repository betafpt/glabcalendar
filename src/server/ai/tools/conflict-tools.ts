import type { AIContext } from "./context";
import type { Shoot } from "@/server/db/schema";
import { formatZonedDate } from "@/lib/zoned-datetime";

export async function checkConflictsTool(
  ctx: AIContext,
  args: {
    startDate?: string;
    endDate?: string;
  }
) {
  const now = new Date();
  const start = args.startDate ? new Date(args.startDate) : new Date(now.getTime() - 86400_000);
  const end = args.endDate ? new Date(args.endDate) : new Date(now.getTime() + 7 * 86400_000);

  const shoots: Shoot[] = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  const activeShoots = shoots.filter((s: Shoot) => s.status !== "cancelled" && !s.isTestData);
  const shootIds = activeShoots.map((s: Shoot) => s.id);

  if (shootIds.length === 0) {
    return {
      hasConflicts: false,
      conflictCount: 0,
      crewConflicts: [],
      equipmentConflicts: [],
      message: "Không có buổi quay nào trong khoảng thời gian này.",
    };
  }

  // Find crew assignments and conflicts
  const crewAssignments = await ctx.crewAssignmentRepo.listForShoots(ctx.organizationId, shootIds);
  const crewMembersMap = new Map<string, string>();
  for (const item of crewAssignments) {
    crewMembersMap.set(item.crewMember.id, item.crewMember.name);
  }

  const crewConflicts: Array<{
    crewMemberName: string;
    shootTitle: string;
    conflictingShootTitle: string;
    startsAt: string;
    endsAt: string;
  }> = [];

  for (const item of crewAssignments) {
    const shoot = activeShoots.find((s: Shoot) => s.id === item.assignment.shootId);
    if (!shoot) continue;

    const conflicts = await ctx.crewAssignmentRepo.findConflicts(
      ctx.organizationId,
      item.crewMember.id,
      shoot.id,
      shoot.startsAt,
      shoot.endsAt
    );

    for (const c of conflicts) {
      crewConflicts.push({
        crewMemberName: item.crewMember.name,
        shootTitle: shoot.title,
        conflictingShootTitle: c.title,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
      });
    }
  }

  // Find equipment bookings and conflicts
  const equipmentBookings = await ctx.equipmentBookingRepo.listForShoots(ctx.organizationId, shootIds);
  const gearConflicts: Array<{
    equipmentName: string;
    shootTitle: string;
    conflictingShootTitle: string;
    startsAt: string;
    endsAt: string;
  }> = [];

  for (const item of equipmentBookings) {
    const shoot = activeShoots.find((s: Shoot) => s.id === item.booking.shootId);
    if (!shoot) continue;

    const conflicts = await ctx.equipmentBookingRepo.findConflicts(
      ctx.organizationId,
      item.equipmentItem.id,
      shoot.id,
      shoot.startsAt,
      shoot.endsAt
    );

    for (const g of conflicts) {
      gearConflicts.push({
        equipmentName: item.equipmentItem.name,
        shootTitle: shoot.title,
        conflictingShootTitle: g.title,
        startsAt: g.startsAt.toISOString(),
        endsAt: g.endsAt.toISOString(),
      });
    }
  }

  const totalConflicts = crewConflicts.length + gearConflicts.length;

  return {
    hasConflicts: totalConflicts > 0,
    conflictCount: totalConflicts,
    crewConflicts,
    equipmentConflicts: gearConflicts,
    timeRange: `${formatZonedDate(start, ctx.timezone)} - ${formatZonedDate(end, ctx.timezone)}`,
  };
}

export async function checkMissingInfoTool(
  ctx: AIContext,
  args: {
    startDate?: string;
    endDate?: string;
  }
) {
  const now = new Date();
  const start = args.startDate ? new Date(args.startDate) : now;
  const end = args.endDate ? new Date(args.endDate) : new Date(now.getTime() + 14 * 86400_000);

  const shoots: Shoot[] = await ctx.calendarRepo.listRange(ctx.organizationId, start, end);
  const activeShoots = shoots.filter((s: Shoot) => s.status !== "cancelled" && !s.isTestData);
  const shootIds = activeShoots.map((s: Shoot) => s.id);

  const [crewAssignments, equipmentBookings] = await Promise.all([
    ctx.crewAssignmentRepo.listForShoots(ctx.organizationId, shootIds),
    ctx.equipmentBookingRepo.listForShoots(ctx.organizationId, shootIds),
  ]);

  const assignedShootIds = new Set(crewAssignments.map((a) => a.assignment.shootId));
  const bookedShootIds = new Set(equipmentBookings.map((b) => b.booking.shootId));

  const issues: Array<{
    shootId: string;
    title: string;
    date: string;
    missingFields: string[];
  }> = [];

  for (const s of activeShoots) {
    const missing: string[] = [];
    if (!s.locationName || s.locationName.trim() === "") missing.push("Địa điểm (Location)");
    if (!assignedShootIds.has(s.id)) missing.push("Chưa phân công ekip (Crew)");
    if (!bookedShootIds.has(s.id)) missing.push("Chưa đặt thiết bị (Gear)");

    if (missing.length > 0) {
      issues.push({
        shootId: s.id,
        title: s.title,
        date: formatZonedDate(s.startsAt, ctx.timezone),
        missingFields: missing,
      });
    }
  }

  return {
    totalShootsChecked: activeShoots.length,
    shootsWithMissingInfo: issues.length,
    issues,
  };
}
