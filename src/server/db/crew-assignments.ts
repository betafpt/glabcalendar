import { and, desc, eq, inArray, lt, gt, ne } from "drizzle-orm";
import type { Database } from "./index";
import { crewMembers, projects, shootCrewAssignments, shoots, type ShootCrewAssignment } from "./schema";

export type CrewConflict = { shootId: string; title: string; startsAt: Date; endsAt: Date };
export type CrewConflictRow = CrewConflict & { crewMemberId: string };

export function createCrewAssignmentRepository(database: Database) {
  return {
    async listForShoot(organizationId: string, shootId: string) {
      return database
        .select({
          assignment: shootCrewAssignments,
          crewMember: {
            id: crewMembers.id,
            name: crewMembers.name,
            defaultRole: crewMembers.defaultRole,
            status: crewMembers.status,
          },
        })
        .from(shootCrewAssignments)
        .innerJoin(crewMembers, eq(shootCrewAssignments.crewMemberId, crewMembers.id))
        .where(and(eq(shootCrewAssignments.organizationId, organizationId), eq(shootCrewAssignments.shootId, shootId)));
    },
    async listForShoots(organizationId: string, shootIds: string[]) {
      if (shootIds.length === 0) return [];

      return database
        .select({ assignment: shootCrewAssignments, crewMember: crewMembers })
        .from(shootCrewAssignments)
        .innerJoin(crewMembers, eq(shootCrewAssignments.crewMemberId, crewMembers.id))
        .where(
          and(
            eq(shootCrewAssignments.organizationId, organizationId),
            inArray(shootCrewAssignments.shootId, shootIds)
          )
        );
    },
    async listForRange(organizationId: string, start: Date, end: Date) {
      return database
        .select({ assignment: shootCrewAssignments, crewMember: crewMembers })
        .from(shootCrewAssignments)
        .innerJoin(crewMembers, eq(shootCrewAssignments.crewMemberId, crewMembers.id))
        .innerJoin(shoots, eq(shootCrewAssignments.shootId, shoots.id))
        .where(
          and(
            eq(shootCrewAssignments.organizationId, organizationId),
            lt(shoots.startsAt, end),
            gt(shoots.endsAt, start)
          )
        );
    },
    async listForCrewMember(organizationId: string, crewMemberId: string) {
      return database
        .select({
          assignment: shootCrewAssignments,
          shoot: shoots,
          project: {
            id: projects.id,
            name: projects.name,
            clientName: projects.clientName,
            status: projects.status,
          },
        })
        .from(shootCrewAssignments)
        .innerJoin(shoots, eq(shootCrewAssignments.shootId, shoots.id))
        .leftJoin(projects, eq(shoots.projectId, projects.id))
        .where(
          and(
            eq(shootCrewAssignments.organizationId, organizationId),
            eq(shootCrewAssignments.crewMemberId, crewMemberId)
          )
        )
        .orderBy(desc(shoots.startsAt));
    },
    async findConflicts(organizationId: string, crewMemberId: string, targetShootId: string, startsAt: Date, endsAt: Date): Promise<CrewConflict[]> {
      return database
        .select({ shootId: shoots.id, title: shoots.title, startsAt: shoots.startsAt, endsAt: shoots.endsAt })
        .from(shootCrewAssignments)
        .innerJoin(shoots, eq(shootCrewAssignments.shootId, shoots.id))
        .where(and(
          eq(shootCrewAssignments.organizationId, organizationId),
          eq(shootCrewAssignments.crewMemberId, crewMemberId),
          ne(shoots.id, targetShootId),
          ne(shoots.status, "cancelled"),
          lt(shoots.startsAt, endsAt),
          gt(shoots.endsAt, startsAt)
        ));
    },
    async findConflictsForCrewMembers(
      organizationId: string,
      crewMemberIds: string[],
      targetShootId: string,
      startsAt: Date,
      endsAt: Date
    ): Promise<CrewConflictRow[]> {
      if (crewMemberIds.length === 0) return [];

      return database
        .select({
          crewMemberId: shootCrewAssignments.crewMemberId,
          shootId: shoots.id,
          title: shoots.title,
          startsAt: shoots.startsAt,
          endsAt: shoots.endsAt,
        })
        .from(shootCrewAssignments)
        .innerJoin(shoots, eq(shootCrewAssignments.shootId, shoots.id))
        .where(and(
          eq(shootCrewAssignments.organizationId, organizationId),
          inArray(shootCrewAssignments.crewMemberId, crewMemberIds),
          ne(shoots.id, targetShootId),
          ne(shoots.status, "cancelled"),
          lt(shoots.startsAt, endsAt),
          gt(shoots.endsAt, startsAt)
        ));
    },
    async create(input: { organizationId: string; shootId: string; crewMemberId: string; role?: string | null; notes?: string | null }): Promise<ShootCrewAssignment> {
      const [assignment] = await database.insert(shootCrewAssignments).values(input).returning();
      if (!assignment) throw new Error("Failed to assign crew member.");
      return assignment;
    },
    async remove(organizationId: string, assignmentId: string): Promise<boolean> {
      const deleted = await database.delete(shootCrewAssignments).where(and(eq(shootCrewAssignments.organizationId, organizationId), eq(shootCrewAssignments.id, assignmentId))).returning({ id: shootCrewAssignments.id });
      return deleted.length > 0;
    },
  };
}
