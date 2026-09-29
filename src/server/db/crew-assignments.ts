import { and, eq, lt, gt, ne } from "drizzle-orm";
import type { Database } from "./index";
import { crewMembers, shootCrewAssignments, shoots, type ShootCrewAssignment } from "./schema";

export type CrewConflict = { shootId: string; title: string; startsAt: Date; endsAt: Date };

export function createCrewAssignmentRepository(database: Database) {
  return {
    async listForShoot(organizationId: string, shootId: string) {
      return database
        .select({ assignment: shootCrewAssignments, crewMember: crewMembers })
        .from(shootCrewAssignments)
        .innerJoin(crewMembers, eq(shootCrewAssignments.crewMemberId, crewMembers.id))
        .where(and(eq(shootCrewAssignments.organizationId, organizationId), eq(shootCrewAssignments.shootId, shootId)));
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
