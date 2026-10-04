import { randomUUID } from "node:crypto";
import type { AIContext } from "../tools/context";
import type { AIProposal, AIProposalDiffField, AIConflictItem } from "../types";
import { formatZonedDate, formatZonedTime } from "@/lib/zoned-datetime";
import { logAIMutation } from "../audit/logger";

// In-memory proposal store with TTL (15 minutes)
interface StoredProposal {
  proposal: AIProposal;
  originalRequest: string;
  organizationId: string;
  userId?: string | null;
  expiresAt: number;
}

const proposalStore = new Map<string, StoredProposal>();

function cleanupExpiredProposals() {
  const now = Date.now();
  proposalStore.forEach((item, id) => {
    if (item.expiresAt < now) {
      proposalStore.delete(id);
    }
  });
}

export async function createShootProposal(
  ctx: AIContext,
  params: {
    originalRequest: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    locationName?: string | null;
    projectNameOrClient?: string | null;
    crewMemberNames?: string[];
    equipmentNames?: string[];
    userId?: string | null;
  }
): Promise<AIProposal> {
  cleanupExpiredProposals();

  // 1. Resolve project
  let resolvedProjectId: string | null = null;
  let resolvedProjectName: string | null = null;
  if (params.projectNameOrClient) {
    const qLower = params.projectNameOrClient.toLowerCase().trim();
    const projects = await ctx.projectRepo.list(ctx.organizationId);
    const matched = projects.find(
      (p) => p.name.toLowerCase().includes(qLower) || (p.clientName || "").toLowerCase().includes(qLower)
    );
    if (matched) {
      resolvedProjectId = matched.id;
      resolvedProjectName = matched.name;
    }
  }

  // 2. Resolve crew
  const resolvedCrewIds: string[] = [];
  const resolvedCrewNames: string[] = [];
  if (params.crewMemberNames && params.crewMemberNames.length > 0) {
    const allCrew = await ctx.crewRepo.list(ctx.organizationId);
    for (const name of params.crewMemberNames) {
      const q = name.toLowerCase().trim();
      const match = allCrew.find((c) => c.name.toLowerCase().includes(q));
      if (match) {
        resolvedCrewIds.push(match.id);
        resolvedCrewNames.push(match.name);
      }
    }
  }

  // 3. Resolve equipment
  const resolvedGearIds: string[] = [];
  const resolvedGearNames: string[] = [];
  if (params.equipmentNames && params.equipmentNames.length > 0) {
    const allGear = await ctx.equipmentRepo.list(ctx.organizationId);
    for (const name of params.equipmentNames) {
      const q = name.toLowerCase().trim();
      const match = allGear.find((g) => g.name.toLowerCase().includes(q) || (g.assetCode || "").toLowerCase().includes(q));
      if (match) {
        resolvedGearIds.push(match.id);
        resolvedGearNames.push(match.name);
      }
    }
  }

  // 4. Check conflicts for resolved crew & gear
  const conflicts: AIConflictItem[] = [];

  for (const crewId of resolvedCrewIds) {
    const crewConflicts = await ctx.crewAssignmentRepo.findConflicts(
      ctx.organizationId,
      crewId,
      "new-shoot-id",
      params.startsAt,
      params.endsAt
    );
    const crewName = resolvedCrewNames[resolvedCrewIds.indexOf(crewId)];
    for (const c of crewConflicts) {
      conflicts.push({
        type: "crew",
        targetName: crewName,
        conflictingShootTitle: c.title,
        timeRange: `${formatZonedTime(c.startsAt, ctx.timezone)} - ${formatZonedTime(c.endsAt, ctx.timezone)}`,
      });
    }
  }

  for (const gearId of resolvedGearIds) {
    const gearConflicts = await ctx.equipmentBookingRepo.findConflicts(
      ctx.organizationId,
      gearId,
      "new-shoot-id",
      params.startsAt,
      params.endsAt
    );
    const gearName = resolvedGearNames[resolvedGearIds.indexOf(gearId)];
    for (const g of gearConflicts) {
      conflicts.push({
        type: "equipment",
        targetName: gearName,
        conflictingShootTitle: g.title,
        timeRange: `${formatZonedTime(g.startsAt, ctx.timezone)} - ${formatZonedTime(g.endsAt, ctx.timezone)}`,
      });
    }
  }

  // 5. Construct diff
  const diff: AIProposalDiffField[] = [
    {
      field: "title",
      labelVi: "Tiêu đề",
      labelEn: "Title",
      oldValue: null,
      newValue: params.title,
    },
    {
      field: "date",
      labelVi: "Ngày quay",
      labelEn: "Date",
      oldValue: null,
      newValue: formatZonedDate(params.startsAt, ctx.timezone),
    },
    {
      field: "time",
      labelVi: "Thời gian",
      labelEn: "Time",
      oldValue: null,
      newValue: `${formatZonedTime(params.startsAt, ctx.timezone)} - ${formatZonedTime(params.endsAt, ctx.timezone)}`,
    },
  ];

  if (params.locationName) {
    diff.push({
      field: "location",
      labelVi: "Địa điểm",
      labelEn: "Location",
      oldValue: null,
      newValue: params.locationName,
    });
  }

  if (resolvedProjectName) {
    diff.push({
      field: "project",
      labelVi: "Dự án",
      labelEn: "Project",
      oldValue: null,
      newValue: resolvedProjectName,
    });
  }

  if (resolvedCrewNames.length > 0) {
    diff.push({
      field: "crew",
      labelVi: "Ekip phân công",
      labelEn: "Crew",
      oldValue: null,
      newValue: resolvedCrewNames.join(", "),
    });
  }

  if (resolvedGearNames.length > 0) {
    diff.push({
      field: "equipment",
      labelVi: "Thiết bị đặt",
      labelEn: "Equipment",
      oldValue: null,
      newValue: resolvedGearNames.join(", "),
    });
  }

  const proposalId = `prop-${randomUUID()}`;
  const proposal: AIProposal = {
    id: proposalId,
    actionType: "create_shoot",
    title: params.title,
    summaryVi: `Tạo lịch quay mới: "${params.title}" vào ngày ${formatZonedDate(params.startsAt, ctx.timezone)}`,
    summaryEn: `Create new shoot: "${params.title}" on ${formatZonedDate(params.startsAt, ctx.timezone)}`,
    diff,
    payload: {
      title: params.title,
      startsAt: params.startsAt.toISOString(),
      endsAt: params.endsAt.toISOString(),
      locationName: params.locationName || null,
      projectId: resolvedProjectId,
      crewMemberIds: resolvedCrewIds,
      equipmentItemIds: resolvedGearIds,
    },
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts,
    requiresConfirmation: true,
    createdAt: new Date().toISOString(),
  };

  proposalStore.set(proposalId, {
    proposal,
    originalRequest: params.originalRequest,
    organizationId: ctx.organizationId,
    userId: params.userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return proposal;
}

export async function createMoveShootProposal(
  ctx: AIContext,
  params: {
    originalRequest: string;
    shootIdOrTitle: string;
    newStartsAt: Date;
    newEndsAt: Date;
    newLocationName?: string;
    userId?: string | null;
  }
): Promise<AIProposal> {
  cleanupExpiredProposals();

  // Find shoot
  let shoot = await ctx.shootRepo.findById(ctx.organizationId, params.shootIdOrTitle);
  if (!shoot) {
    const all = await ctx.calendarRepo.listRange(
      ctx.organizationId,
      new Date(Date.now() - 30 * 86400_000),
      new Date(Date.now() + 60 * 86400_000)
    );
    shoot = all.find((s: { title: string }) => s.title.toLowerCase().includes(params.shootIdOrTitle.toLowerCase())) || null;
  }

  if (!shoot) {
    throw new Error(`Không tìm thấy buổi quay nào khớp với "${params.shootIdOrTitle}".`);
  }

  // Check conflicts for existing assigned crew on new date
  const [crewAssignments, gearBookings] = await Promise.all([
    ctx.crewAssignmentRepo.listForShoot(ctx.organizationId, shoot.id),
    ctx.equipmentBookingRepo.listForShoot(ctx.organizationId, shoot.id),
  ]);

  const conflicts: AIConflictItem[] = [];

  for (const item of crewAssignments) {
    const cConflicts = await ctx.crewAssignmentRepo.findConflicts(
      ctx.organizationId,
      item.crewMember.id,
      shoot.id,
      params.newStartsAt,
      params.newEndsAt
    );
    for (const c of cConflicts) {
      conflicts.push({
        type: "crew",
        targetName: item.crewMember.name,
        conflictingShootTitle: c.title,
        timeRange: `${formatZonedTime(c.startsAt, ctx.timezone)} - ${formatZonedTime(c.endsAt, ctx.timezone)}`,
      });
    }
  }

  for (const item of gearBookings) {
    const gConflicts = await ctx.equipmentBookingRepo.findConflicts(
      ctx.organizationId,
      item.equipmentItem.id,
      shoot.id,
      params.newStartsAt,
      params.newEndsAt
    );
    for (const g of gConflicts) {
      conflicts.push({
        type: "equipment",
        targetName: item.equipmentItem.name,
        conflictingShootTitle: g.title,
        timeRange: `${formatZonedTime(g.startsAt, ctx.timezone)} - ${formatZonedTime(g.endsAt, ctx.timezone)}`,
      });
    }
  }

  const diff: AIProposalDiffField[] = [
    {
      field: "date",
      labelVi: "Ngày quay",
      labelEn: "Date",
      oldValue: formatZonedDate(shoot.startsAt, ctx.timezone),
      newValue: formatZonedDate(params.newStartsAt, ctx.timezone),
    },
    {
      field: "time",
      labelVi: "Thời gian",
      labelEn: "Time",
      oldValue: `${formatZonedTime(shoot.startsAt, ctx.timezone)} - ${formatZonedTime(shoot.endsAt, ctx.timezone)}`,
      newValue: `${formatZonedTime(params.newStartsAt, ctx.timezone)} - ${formatZonedTime(params.newEndsAt, ctx.timezone)}`,
    },
  ];

  if (params.newLocationName && params.newLocationName !== shoot.locationName) {
    diff.push({
      field: "location",
      labelVi: "Địa điểm",
      labelEn: "Location",
      oldValue: shoot.locationName || "Chưa có",
      newValue: params.newLocationName,
    });
  }

  const proposalId = `prop-${randomUUID()}`;
  const proposal: AIProposal = {
    id: proposalId,
    actionType: "move_shoot",
    title: shoot.title,
    summaryVi: `Dời lịch quay "${shoot.title}" sang ${formatZonedDate(params.newStartsAt, ctx.timezone)}`,
    summaryEn: `Reschedule shoot "${shoot.title}" to ${formatZonedDate(params.newStartsAt, ctx.timezone)}`,
    diff,
    payload: {
      shootId: shoot.id,
      startsAt: params.newStartsAt.toISOString(),
      endsAt: params.newEndsAt.toISOString(),
      locationName: params.newLocationName ?? shoot.locationName,
    },
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts,
    requiresConfirmation: true,
    createdAt: new Date().toISOString(),
  };

  proposalStore.set(proposalId, {
    proposal,
    originalRequest: params.originalRequest,
    organizationId: ctx.organizationId,
    userId: params.userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return proposal;
}

export async function createBulkMoveProposal(
  ctx: AIContext,
  params: {
    originalRequest: string;
    projectNameOrQuery: string;
    daysShift?: number;
    userId?: string | null;
  }
): Promise<AIProposal> {
  cleanupExpiredProposals();
  const shiftDays = params.daysShift ?? 7;
  const shiftMs = shiftDays * 24 * 60 * 60 * 1000;

  const allShoots = await ctx.calendarRepo.listRange(
    ctx.organizationId,
    new Date(Date.now() - 30 * 86400_000),
    new Date(Date.now() + 60 * 86400_000)
  );

  const qLower = params.projectNameOrQuery.toLowerCase().trim();
  const targetShoots = allShoots.filter((s: { title: string }) => s.title.toLowerCase().includes(qLower));

  if (targetShoots.length === 0) {
    throw new Error(`Không tìm thấy buổi quay nào thuộc "${params.projectNameOrQuery}" để dời hàng loạt.`);
  }

  const diff: AIProposalDiffField[] = targetShoots.map((s: { title: string; startsAt: Date }) => {
    const oldDate = formatZonedDate(s.startsAt, ctx.timezone);
    const newStarts = new Date(s.startsAt.getTime() + shiftMs);
    const newDate = formatZonedDate(newStarts, ctx.timezone);
    return {
      field: "shoot_date",
      labelVi: s.title,
      oldValue: oldDate,
      newValue: newDate,
    };
  });

  const moves = targetShoots.map((s: { id: string; startsAt: Date; endsAt: Date }) => ({
    shootId: s.id,
    newStartsAt: new Date(s.startsAt.getTime() + shiftMs).toISOString(),
    newEndsAt: new Date(s.endsAt.getTime() + shiftMs).toISOString(),
  }));

  const proposalId = `prop-${randomUUID()}`;
  const proposal: AIProposal = {
    id: proposalId,
    actionType: "bulk_move_shoots",
    title: `Dời hàng loạt ${targetShoots.length} buổi quay của "${params.projectNameOrQuery}"`,
    summaryVi: `${targetShoots.length} sự kiện sẽ được dời sang tuần sau (+${shiftDays} ngày).`,
    summaryEn: `${targetShoots.length} shoots will be shifted by +${shiftDays} days.`,
    diff,
    payload: {
      moves,
      projectName: params.projectNameOrQuery,
      totalMoves: moves.length,
    },
    hasConflicts: false,
    conflictCount: 0,
    conflicts: [],
    requiresConfirmation: true,
    createdAt: new Date().toISOString(),
  };

  proposalStore.set(proposalId, {
    proposal,
    originalRequest: params.originalRequest,
    organizationId: ctx.organizationId,
    userId: params.userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return proposal;
}

/**
 * Executes a proposal only after explicit user confirmation.
 */
export async function executeConfirmedProposal(
  ctx: AIContext,
  proposalId: string
): Promise<{ ok: boolean; message: string; shootId?: string }> {
  const stored = proposalStore.get(proposalId);
  if (!stored) {
    return { ok: false, message: "Đề xuất đã hết hạn hoặc không tồn tại. Vui lòng thử lại." };
  }

  const { proposal, originalRequest, organizationId, userId } = stored;

  try {
    if (proposal.actionType === "create_shoot") {
      const payload = proposal.payload as any;
      const created = await ctx.shootRepo.create({
        organizationId,
        title: payload.title,
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
        locationName: payload.locationName || null,
        projectId: payload.projectId || null,
        syncPolicy: "google",
        status: "planned",
      });

      // Assign crew if provided
      if (Array.isArray(payload.crewMemberIds)) {
        for (const crewId of payload.crewMemberIds) {
          await ctx.crewAssignmentRepo.create({
            organizationId,
            shootId: created.id,
            crewMemberId: crewId,
          });
        }
      }

      // Book gear if provided
      if (Array.isArray(payload.equipmentItemIds)) {
        for (const gearId of payload.equipmentItemIds) {
          await ctx.equipmentBookingRepo.create({
            organizationId,
            shootId: created.id,
            equipmentItemId: gearId,
            quantity: 1,
          });
        }
      }

      await logAIMutation({
        organizationId,
        userId,
        originalRequest,
        actionType: proposal.actionType,
        proposedAction: proposal.payload,
        validatedAction: { shootId: created.id, ...proposal.payload },
        affectedEntityIds: [created.id],
        result: "confirmed_executed",
      });

      proposalStore.delete(proposalId);
      return { ok: true, message: `Đã tạo thành công lịch quay "${created.title}".`, shootId: created.id };
    }

    if (proposal.actionType === "move_shoot") {
      const payload = proposal.payload as any;
      const updated = await ctx.shootRepo.update(organizationId, payload.shootId, {
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
        locationName: payload.locationName || null,
      });

      if (!updated) throw new Error("Không thể cập nhật buổi quay.");

      await logAIMutation({
        organizationId,
        userId,
        originalRequest,
        actionType: proposal.actionType,
        proposedAction: proposal.payload,
        validatedAction: { shootId: updated.id, ...proposal.payload },
        affectedEntityIds: [updated.id],
        result: "confirmed_executed",
      });

      proposalStore.delete(proposalId);
      return { ok: true, message: `Đã dời lịch quay "${updated.title}" thành công.`, shootId: updated.id };
    }

    if (proposal.actionType === "bulk_move_shoots") {
      const payload = proposal.payload as any;
      const movedIds: string[] = [];
      for (const item of payload.moves) {
        await ctx.shootRepo.update(organizationId, item.shootId, {
          startsAt: new Date(item.newStartsAt),
          endsAt: new Date(item.newEndsAt),
        });
        movedIds.push(item.shootId);
      }

      await logAIMutation({
        organizationId,
        userId,
        originalRequest,
        actionType: proposal.actionType,
        proposedAction: proposal.payload,
        validatedAction: { movedIds, ...proposal.payload },
        affectedEntityIds: movedIds,
        result: "confirmed_executed",
      });

      proposalStore.delete(proposalId);
      return { ok: true, message: `Đã dời thành công ${movedIds.length} buổi quay.` };
    }

    return { ok: false, message: `Loại hành động ${proposal.actionType} chưa được hỗ trợ.` };
  } catch (err) {
    return { ok: false, message: `Lỗi khi thực thi: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Cancels a proposal with ZERO mutations.
 */
export async function cancelProposal(
  ctx: AIContext,
  proposalId: string
): Promise<{ ok: boolean; message: string }> {
  const stored = proposalStore.get(proposalId);
  if (stored) {
    await logAIMutation({
      organizationId: stored.organizationId,
      userId: stored.userId,
      originalRequest: stored.originalRequest,
      actionType: stored.proposal.actionType,
      proposedAction: stored.proposal.payload,
      validatedAction: {},
      affectedEntityIds: [],
      result: "cancelled_by_user",
    });
    proposalStore.delete(proposalId);
  }
  return { ok: true, message: "Đã hủy yêu cầu thay đổi (không có dữ liệu nào bị thay đổi)." };
}
