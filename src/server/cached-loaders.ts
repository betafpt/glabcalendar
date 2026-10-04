import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { createDashboardRepository } from "@/server/db/dashboard";
import { createCalendarRepository } from "@/server/db/calendar";
import { createCalendarService } from "@/server/services/calendar";
import { createCrewRepository } from "@/server/db/crew";
import { createEquipmentRepository } from "@/server/db/equipment";
import { createProjectRepository } from "@/server/db/projects";
import { getCalendarFilterOptions } from "@/server/calendar-filter-options";
import { CACHE_TAGS } from "./cache-keys";

/**
 * Cached Dashboard Loader
 * Phục hồi dữ liệu tức thì cho Dashboard trong 10-30ms khi người dùng chuyển trang.
 */
export const getCachedDashboardToday = (organizationId: string, timezone: string) => {
  const cachedFn = unstable_cache(
    async () => {
      const repo = createDashboardRepository(db);
      return repo.getToday(organizationId, timezone);
    },
    [`dashboard-${organizationId}-${timezone}`],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.dashboard(organizationId)],
    }
  );
  return cachedFn();
};

/**
 * Cached Calendar Shoots Loader
 * Tối ưu thời gian tải lịch trình cho Calendar (Month / Week / Day)
 */
export const getCachedCalendarShoots = (
  organizationId: string,
  startIso: string,
  endIso: string,
  filtersKey: string
) => {
  const cachedFn = unstable_cache(
    async () => {
      const calendarRepo = createCalendarRepository(db);
      const filters = JSON.parse(filtersKey);
      return createCalendarService(calendarRepo).list(
        organizationId,
        new Date(startIso),
        new Date(endIso),
        filters
      );
    },
    [`calendar-shoots-${organizationId}-${startIso}-${endIso}-${filtersKey}`],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.calendar(organizationId)],
    }
  );
  return cachedFn();
};

/**
 * Cached Calendar Filter Options (Projects, Crew, Gear)
 */
export const getCachedCalendarFilterOptions = (organizationId: string) => {
  const cachedFn = unstable_cache(
    async () => {
      return getCalendarFilterOptions(organizationId);
    },
    [`calendar-filters-${organizationId}`],
    {
      revalidate: 300,
      tags: [
        CACHE_TAGS.calendar(organizationId),
        CACHE_TAGS.crew(organizationId),
        CACHE_TAGS.equipment(organizationId),
      ],
    }
  );
  return cachedFn();
};

/**
 * Cached Crew List
 */
export const getCachedCrewList = (organizationId: string) => {
  const cachedFn = unstable_cache(
    async () => {
      return createCrewRepository(db).list(organizationId);
    },
    [`crew-list-${organizationId}`],
    {
      revalidate: 120,
      tags: [CACHE_TAGS.crew(organizationId)],
    }
  );
  return cachedFn();
};

/**
 * Cached Equipment List
 */
export const getCachedEquipmentList = (organizationId: string) => {
  const cachedFn = unstable_cache(
    async () => {
      return createEquipmentRepository(db).list(organizationId);
    },
    [`equipment-list-${organizationId}`],
    {
      revalidate: 120,
      tags: [CACHE_TAGS.equipment(organizationId)],
    }
  );
  return cachedFn();
};

/**
 * Cached Projects List
 */
export const getCachedProjectsList = (organizationId: string) => {
  const cachedFn = unstable_cache(
    async () => {
      return createProjectRepository(db).list(organizationId);
    },
    [`projects-list-${organizationId}`],
    {
      revalidate: 120,
      tags: [CACHE_TAGS.projects(organizationId)],
    }
  );
  return cachedFn();
};

/**
 * Cached Shoot Resources & Readiness Loader
 * Tối ưu hóa thời gian tải Shoot Detail từ >700ms xuống <30ms khi chuyển trang.
 */
export const getCachedShootDetailData = (organizationId: string, shootId: string) => {
  const cachedFn = unstable_cache(
    async () => {
      const [{ createShootRepository }, { createCrewAssignmentRepository }, { createEquipmentBookingRepository }, { createChecklistRepository }, { createProjectRepository }, { createShootAssigneesRepository }, { calculateShootReadiness }] = await Promise.all([
        import("@/server/db/shoots"),
        import("@/server/db/crew-assignments"),
        import("@/server/db/equipment-bookings"),
        import("@/server/db/checklists"),
        import("@/server/db/projects"),
        import("@/server/db/shoot-assignees"),
        import("@/server/services/shoot-readiness"),
      ]);

      const shootRepo = createShootRepository(db);
      const shoot = await shootRepo.findById(organizationId, shootId);
      if (!shoot) return null;

      const crewAssignmentRepo = createCrewAssignmentRepository(db);
      const equipmentBookingRepo = createEquipmentBookingRepository(db);
      const checklistRepo = createChecklistRepository(db);
      const projectRepo = createProjectRepository(db);
      const assigneesRepo = createShootAssigneesRepository(db);

      const [crewAssignments, equipmentBookings, checklistItems, currentProject, accountAssignees] = await Promise.all([
        crewAssignmentRepo.listForShoot(organizationId, shootId),
        equipmentBookingRepo.listForShoot(organizationId, shootId),
        checklistRepo.listForShoot(organizationId, shootId),
        shoot.projectId ? projectRepo.findById(organizationId, shoot.projectId) : Promise.resolve(null),
        assigneesRepo.listAssigneesForShoot(shootId),
      ]);

      const isCancelled = shoot.status === "cancelled";
      const [crewConflictGroups, equipmentConflictGroups] = isCancelled
        ? [
            crewAssignments.map(({ crewMember }) => ({ crewMember, conflicts: [] })),
            equipmentBookings.map(({ equipmentItem }) => ({ equipmentItem, conflicts: [] })),
          ]
        : await Promise.all([
            crewAssignmentRepo
              .findConflictsForCrewMembers(
                organizationId,
                crewAssignments.map(({ crewMember }) => crewMember.id),
                shoot.id,
                shoot.startsAt,
                shoot.endsAt
              )
              .then((rows) =>
                crewAssignments.map(({ crewMember }) => ({
                  crewMember,
                  conflicts: rows
                    .filter((row) => row.crewMemberId === crewMember.id)
                    .map(({ crewMemberId: _crewMemberId, ...conflict }) => conflict),
                }))
              ),
            equipmentBookingRepo
              .findConflictsForEquipmentItems(
                organizationId,
                equipmentBookings.map(({ equipmentItem }) => equipmentItem.id),
                shoot.id,
                shoot.startsAt,
                shoot.endsAt
              )
              .then((rows) =>
                equipmentBookings.map(({ equipmentItem }) => ({
                  equipmentItem,
                  conflicts: rows
                    .filter((row) => row.equipmentItemId === equipmentItem.id)
                    .map(({ equipmentItemId: _equipmentItemId, ...conflict }) => conflict),
                }))
              ),
          ]);

      const readiness = calculateShootReadiness({
        shoot,
        checklistItems,
        crewAssignments: crewConflictGroups,
        equipmentBookings: equipmentConflictGroups,
      });

      return {
        shoot,
        crewAssignments,
        equipmentBookings,
        checklistItems,
        currentProject,
        accountAssignees,
        crewConflictCount: crewConflictGroups.reduce((acc, g) => acc + g.conflicts.length, 0),
        equipmentConflictCount: equipmentConflictGroups.reduce((acc, g) => acc + g.conflicts.length, 0),
        readiness,
      };
    },
    [`shoot-detail-full-${organizationId}-${shootId}`],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.shootDetail(organizationId, shootId)],
    }
  );
  return cachedFn();
};
