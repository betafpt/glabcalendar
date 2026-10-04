import type { CrewConflict } from "@/server/db/crew-assignments";
import type { EquipmentConflict } from "@/server/db/equipment-bookings";
import type {
  CrewMember,
  EquipmentItem,
  Shoot,
  ShootChecklistItem,
} from "@/server/db/schema";

export type ShootReadinessStatus =
  | "ready"
  | "in_progress"
  | "blocked"
  | "needs_setup"
  | "cancelled";

export type CrewConflictGroup = {
  crewMemberId: string;
  crewMemberName: string | null;
  conflicts: CrewConflict[];
};

export type EquipmentConflictGroup = {
  equipmentItemId: string;
  equipmentItemName: string | null;
  conflicts: EquipmentConflict[];
};

export type ShootReadinessSummary = {
  shootId: string;
  shootStatus: Shoot["status"];
  isCancelled: boolean;

  // Checklist
  checklistTotal: number;
  checklistCompleted: number;
  checklistPercent: number;

  // Crew
  crewCount: number;
  crewConflictCount: number;
  crewConflicts: CrewConflictGroup[];

  // Equipment
  equipmentCount: number;
  equipmentConflictCount: number;
  equipmentConflicts: EquipmentConflictGroup[];

  // Overall
  conflictCount: number;
  hasConflicts: boolean;
  status: ShootReadinessStatus;
  readinessPercent: number;
  isReady: boolean;
};

export function calculateShootReadiness(input: {
  shoot: Pick<Shoot, "id" | "status" | "startsAt" | "endsAt" | "title">;
  checklistItems: Array<Pick<ShootChecklistItem, "id" | "isCompleted" | "title">>;
  crewAssignments: Array<{
    crewMember: Pick<CrewMember, "id"> & Partial<Pick<CrewMember, "name">>;
    conflicts?: CrewConflict[];
  }>;
  equipmentBookings: Array<{
    equipmentItem: Pick<EquipmentItem, "id"> & Partial<Pick<EquipmentItem, "name">>;
    conflicts?: EquipmentConflict[];
  }>;
}): ShootReadinessSummary {
  const isCancelled = input.shoot.status === "cancelled";
  const checklistTotal = input.checklistItems.length;
  const checklistCompleted = input.checklistItems.filter((i) => i.isCompleted).length;
  const checklistPercent =
    checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  const crewCount = input.crewAssignments.length;
  const equipmentCount = input.equipmentBookings.length;

  const crewConflicts: CrewConflictGroup[] = isCancelled
    ? []
    : input.crewAssignments
        .filter((c) => (c.conflicts?.length ?? 0) > 0)
        .map((c) => ({
          crewMemberId: c.crewMember.id,
          crewMemberName: c.crewMember.name ?? null,
          conflicts: c.conflicts ?? [],
        }));

  const equipmentConflicts: EquipmentConflictGroup[] = isCancelled
    ? []
    : input.equipmentBookings
        .filter((e) => (e.conflicts?.length ?? 0) > 0)
        .map((e) => ({
          equipmentItemId: e.equipmentItem.id,
          equipmentItemName: e.equipmentItem.name ?? null,
          conflicts: e.conflicts ?? [],
        }));

  const crewConflictCount = crewConflicts.reduce(
    (sum, group) => sum + group.conflicts.length,
    0
  );
  const equipmentConflictCount = equipmentConflicts.reduce(
    (sum, group) => sum + group.conflicts.length,
    0
  );
  const conflictCount = crewConflictCount + equipmentConflictCount;
  const hasConflicts = conflictCount > 0;

  let status: ShootReadinessStatus;
  let readinessPercent: number;

  if (isCancelled) {
    status = "cancelled";
    readinessPercent = 0;
  } else if (hasConflicts) {
    status = "blocked";
    readinessPercent = checklistPercent;
  } else if (checklistTotal === 0) {
    status = "needs_setup";
    readinessPercent = 0;
  } else if (checklistCompleted === checklistTotal) {
    status = "ready";
    readinessPercent = 100;
  } else {
    status = "in_progress";
    readinessPercent = checklistPercent;
  }

  const isReady =
    !isCancelled &&
    !hasConflicts &&
    checklistTotal > 0 &&
    checklistCompleted === checklistTotal;

  return {
    shootId: input.shoot.id,
    shootStatus: input.shoot.status,
    isCancelled,
    checklistTotal,
    checklistCompleted,
    checklistPercent,
    crewCount,
    crewConflictCount,
    crewConflicts,
    equipmentCount,
    equipmentConflictCount,
    equipmentConflicts,
    conflictCount,
    hasConflicts,
    status,
    readinessPercent,
    isReady,
  };
}
