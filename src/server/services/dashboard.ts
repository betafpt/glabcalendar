import type { CrewConflict } from "@/server/db/crew-assignments";
import type { EquipmentConflict } from "@/server/db/equipment-bookings";
import type { Project, Shoot, ShootChecklistItem } from "@/server/db/schema";
import { calendarRange } from "@/lib/calendar-range";
import { DEFAULT_APP_TIMEZONE, isValidTimezone } from "@/lib/config";

export type DashboardShoot = {
  shoot: Shoot & { project?: Project | null };
  project: Project | null;
  crewCount: number;
  equipmentCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  conflictCount: number;
  crewConflictCount: number;
  equipmentConflictCount: number;
  readinessPercent: number;
};

export type TodayDashboardQueryOptions = {
  timezone?: string;
  anchor?: Date;
  start?: Date;
  end?: Date;
};

export type DashboardReadinessSummary = {
  totalShoots: number;
  totalConflicts: number;
  totalCrewConflicts: number;
  totalEquipmentConflicts: number;
  totalCrew: number;
  totalEquipment: number;
  checklistTotal: number;
  checklistCompleted: number;
  readinessPercent: number;
  shootsWithConflicts: number;
};

export type TodayDashboardSummary = {
  timezone: string;
  anchor: Date;
  range: { start: Date; end: Date };
  totalShoots: number;
  totalConflicts: number;
  totalCrewConflicts: number;
  totalEquipmentConflicts: number;
  totalCrew: number;
  totalEquipment: number;
  checklistTotal: number;
  checklistCompleted: number;
  readinessPercent: number;
  shootsWithConflicts: number;
  shoots: DashboardShoot[];
};

export interface CalendarRepositoryPort {
  listRange(organizationId: string, start: Date, end: Date): Promise<Shoot[]>;
}

export interface ProjectRepositoryPort {
  list(organizationId: string): Promise<Project[]>;
}

export interface CrewAssignmentRepositoryPort {
  listForShoot(
    organizationId: string,
    shootId: string
  ): Promise<Array<{ crewMember: { id: string } }>>;
  listForShoots?(
    organizationId: string,
    shootIds: string[]
  ): Promise<Array<{ assignment: { shootId: string }; crewMember: { id: string } }>>;
  findConflicts(
    organizationId: string,
    crewMemberId: string,
    targetShootId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<CrewConflict[]>;
}

export interface EquipmentBookingRepositoryPort {
  listForShoot(
    organizationId: string,
    shootId: string
  ): Promise<Array<{ equipmentItem: { id: string } }>>;
  listForShoots?(
    organizationId: string,
    shootIds: string[]
  ): Promise<Array<{ booking: { shootId: string }; equipmentItem: { id: string } }>>;
  findConflicts(
    organizationId: string,
    equipmentItemId: string,
    targetShootId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<EquipmentConflict[]>;
}

export interface ChecklistRepositoryPort {
  listForShoot(
    organizationId: string,
    shootId: string
  ): Promise<Array<Pick<ShootChecklistItem, "id" | "isCompleted">>>;
  listForShoots?(
    organizationId: string,
    shootIds: string[]
  ): Promise<Array<Pick<ShootChecklistItem, "id" | "shootId" | "isCompleted">>>;
}

export interface DashboardRepositoriesPort {
  calendar: CalendarRepositoryPort;
  projects?: ProjectRepositoryPort;
  crewAssignments: CrewAssignmentRepositoryPort;
  equipmentBookings: EquipmentBookingRepositoryPort;
  checklists: ChecklistRepositoryPort;
}

export function sortShootsChronologically<
  T extends { shoot: Pick<Shoot, "startsAt" | "endsAt" | "title"> }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const startA =
      a.shoot.startsAt instanceof Date
        ? a.shoot.startsAt.getTime()
        : new Date(a.shoot.startsAt).getTime();
    const startB =
      b.shoot.startsAt instanceof Date
        ? b.shoot.startsAt.getTime()
        : new Date(b.shoot.startsAt).getTime();
    if (startA !== startB) {
      return startA - startB;
    }

    const endA =
      a.shoot.endsAt instanceof Date
        ? a.shoot.endsAt.getTime()
        : new Date(a.shoot.endsAt).getTime();
    const endB =
      b.shoot.endsAt instanceof Date
        ? b.shoot.endsAt.getTime()
        : new Date(b.shoot.endsAt).getTime();
    if (endA !== endB) {
      return endA - endB;
    }

    return a.shoot.title.localeCompare(b.shoot.title);
  });
}

export function calculateDashboardReadiness(
  shoots: DashboardShoot[]
): DashboardReadinessSummary {
  const totalShoots = shoots.length;
  const totalCrewConflicts = shoots.reduce(
    (sum, s) => sum + s.crewConflictCount,
    0
  );
  const totalEquipmentConflicts = shoots.reduce(
    (sum, s) => sum + s.equipmentConflictCount,
    0
  );
  const totalConflicts = totalCrewConflicts + totalEquipmentConflicts;
  const totalCrew = shoots.reduce((sum, s) => sum + s.crewCount, 0);
  const totalEquipment = shoots.reduce((sum, s) => sum + s.equipmentCount, 0);
  const checklistTotal = shoots.reduce((sum, s) => sum + s.checklistTotal, 0);
  const checklistCompleted = shoots.reduce(
    (sum, s) => sum + s.checklistCompleted,
    0
  );
  const readinessPercent =
    checklistTotal > 0
      ? Math.round((checklistCompleted / checklistTotal) * 100)
      : 0;
  const shootsWithConflicts = shoots.filter((s) => s.conflictCount > 0).length;

  return {
    totalShoots,
    totalConflicts,
    totalCrewConflicts,
    totalEquipmentConflicts,
    totalCrew,
    totalEquipment,
    checklistTotal,
    checklistCompleted,
    readinessPercent,
    shootsWithConflicts,
  };
}

function resolveTimezone(options?: TodayDashboardQueryOptions | string): string {
  if (typeof options === "string" && options.trim()) {
    const tz = options.trim();
    return isValidTimezone(tz) ? tz : DEFAULT_APP_TIMEZONE;
  }
  if (
    options &&
    typeof options === "object" &&
    typeof options.timezone === "string" &&
    options.timezone.trim()
  ) {
    const tz = options.timezone.trim();
    return isValidTimezone(tz) ? tz : DEFAULT_APP_TIMEZONE;
  }
  return DEFAULT_APP_TIMEZONE;
}

function resolveAnchor(
  options?: TodayDashboardQueryOptions | string,
  anchorParam?: Date
): Date {
  if (anchorParam instanceof Date && !Number.isNaN(anchorParam.getTime())) {
    return anchorParam;
  }
  if (
    options &&
    typeof options === "object" &&
    options.anchor instanceof Date &&
    !Number.isNaN(options.anchor.getTime())
  ) {
    return options.anchor;
  }
  return new Date();
}

function resolveRange(
  options?: TodayDashboardQueryOptions | string,
  anchorParam?: Date
): { start: Date; end: Date; timezone: string; anchor: Date } {
  const timezone = resolveTimezone(options);
  const anchor = resolveAnchor(options, anchorParam);

  if (
    options &&
    typeof options === "object" &&
    options.start instanceof Date &&
    options.end instanceof Date
  ) {
    if (options.end.getTime() <= options.start.getTime()) {
      throw new Error("Date range must end after it starts.");
    }
    return {
      start: options.start,
      end: options.end,
      timezone,
      anchor,
    };
  }

  const range = calendarRange("day", anchor, timezone);
  return {
    start: range.start,
    end: range.end,
    timezone,
    anchor,
  };
}

export function createDashboardService(repositories: DashboardRepositoriesPort) {
  return {
    async listToday(
      organizationId: string,
      optionsOrStartOrTimezone?: TodayDashboardQueryOptions | string | Date,
      anchorOrEnd?: Date
    ): Promise<DashboardShoot[]> {
      if (optionsOrStartOrTimezone instanceof Date) {
        if (!(anchorOrEnd instanceof Date)) {
          throw new Error("Date range must include both start and end dates.");
        }
        if (anchorOrEnd.getTime() <= optionsOrStartOrTimezone.getTime()) {
          throw new Error("Date range must end after it starts.");
        }
        return this.listRange(organizationId, optionsOrStartOrTimezone, anchorOrEnd);
      }

      const { start, end } = resolveRange(optionsOrStartOrTimezone, anchorOrEnd);
      return this.listRange(organizationId, start, end);
    },

    async listRange(
      organizationId: string,
      start: Date,
      end: Date
    ): Promise<DashboardShoot[]> {
      if (end.getTime() <= start.getTime()) {
        throw new Error("Date range must end after it starts.");
      }

      const [shoots, projects] = await Promise.all([
        repositories.calendar.listRange(organizationId, start, end),
        repositories.projects ? repositories.projects.list(organizationId) : Promise.resolve([]),
      ]);

      if (shoots.length === 0) {
        return [];
      }

      const projectMap = new Map(projects.map((project) => [project.id, project]));
      const shootMap = new Map(shoots.map((shoot) => [shoot.id, shoot]));

      const shootIds = shoots.map((shoot) => shoot.id);
      const [batchedCrewRows, batchedEquipmentRows, batchedChecklistItems] = await Promise.all([
        repositories.crewAssignments.listForShoots?.(organizationId, shootIds),
        repositories.equipmentBookings.listForShoots?.(organizationId, shootIds),
        repositories.checklists.listForShoots?.(organizationId, shootIds),
      ]);

      const crewByShoot = batchedCrewRows
        ? Map.groupBy(batchedCrewRows, (row) => row.assignment.shootId)
        : null;
      const equipmentByShoot = batchedEquipmentRows
        ? Map.groupBy(batchedEquipmentRows, (row) => row.booking.shootId)
        : null;
      const checklistByShoot = batchedChecklistItems
        ? Map.groupBy(batchedChecklistItems, (item) => item.shootId)
        : null;
      const crewShootsByMember = batchedCrewRows
        ? Map.groupBy(batchedCrewRows, (row) => row.crewMember.id)
        : null;
      const equipmentShootsByItem = batchedEquipmentRows
        ? Map.groupBy(batchedEquipmentRows, (row) => row.equipmentItem.id)
        : null;

      const rows: DashboardShoot[] = await Promise.all(
        shoots.map(async (shoot) => {
          const [crewRows, equipmentRows, checklistItems] = await Promise.all([
            crewByShoot
              ? Promise.resolve(crewByShoot.get(shoot.id) ?? [])
              : repositories.crewAssignments.listForShoot(organizationId, shoot.id),
            equipmentByShoot
              ? Promise.resolve(equipmentByShoot.get(shoot.id) ?? [])
              : repositories.equipmentBookings.listForShoot(organizationId, shoot.id),
            checklistByShoot
              ? Promise.resolve(checklistByShoot.get(shoot.id) ?? [])
              : repositories.checklists.listForShoot(organizationId, shoot.id),
          ]);

          const crewConflictCount = crewShootsByMember
            ? crewRows.reduce((sum, { crewMember }) => {
                const conflicts = (crewShootsByMember.get(crewMember.id) ?? []).filter((row) => {
                  const other = shootMap.get(row.assignment.shootId);
                  return Boolean(
                    other &&
                      other.id !== shoot.id &&
                      other.status !== "cancelled" &&
                      other.startsAt < shoot.endsAt &&
                      other.endsAt > shoot.startsAt
                  );
                });
                return sum + conflicts.length;
              }, 0)
            : (
                await Promise.all(
                  crewRows.map(({ crewMember }) =>
                    repositories.crewAssignments.findConflicts(
                      organizationId,
                      crewMember.id,
                      shoot.id,
                      shoot.startsAt,
                      shoot.endsAt
                    )
                  )
                )
              ).reduce((sum, conflicts) => sum + conflicts.length, 0);

          const equipmentConflictCount = equipmentShootsByItem
            ? equipmentRows.reduce((sum, { equipmentItem }) => {
                const conflicts = (equipmentShootsByItem.get(equipmentItem.id) ?? []).filter((row) => {
                  const other = shootMap.get(row.booking.shootId);
                  return Boolean(
                    other &&
                      other.id !== shoot.id &&
                      other.status !== "cancelled" &&
                      other.startsAt < shoot.endsAt &&
                      other.endsAt > shoot.startsAt
                  );
                });
                return sum + conflicts.length;
              }, 0)
            : (
                await Promise.all(
                  equipmentRows.map(({ equipmentItem }) =>
                    repositories.equipmentBookings.findConflicts(
                      organizationId,
                      equipmentItem.id,
                      shoot.id,
                      shoot.startsAt,
                      shoot.endsAt
                    )
                  )
                )
              ).reduce((sum, conflicts) => sum + conflicts.length, 0);
          const conflictCount = crewConflictCount + equipmentConflictCount;

          const checklistTotal = checklistItems.length;
          const checklistCompleted = checklistItems.filter((item) => item.isCompleted).length;
          const readinessPercent = checklistTotal
            ? Math.round((checklistCompleted / checklistTotal) * 100)
            : 0;

          const project = shoot.projectId ? projectMap.get(shoot.projectId) ?? null : null;
          const enrichedShoot = { ...shoot, project };

          return {
            shoot: enrichedShoot,
            project,
            crewCount: crewRows.length,
            equipmentCount: equipmentRows.length,
            checklistTotal,
            checklistCompleted,
            conflictCount,
            crewConflictCount,
            equipmentConflictCount,
            readinessPercent,
          };
        })
      );

      return sortShootsChronologically(rows);
    },

    async getToday(
      organizationId: string,
      options?: TodayDashboardQueryOptions | string,
      anchorParam?: Date
    ): Promise<TodayDashboardSummary> {
      const { start, end, timezone, anchor } = resolveRange(options, anchorParam);
      const shoots = await this.listRange(organizationId, start, end);
      const readinessSummary = calculateDashboardReadiness(shoots);

      return {
        timezone,
        anchor,
        range: { start, end },
        ...readinessSummary,
        shoots,
      };
    },
  };
}

export const createTodayDashboardService = createDashboardService;
