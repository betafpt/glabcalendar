import { and, asc, eq } from "drizzle-orm";
import type { Database } from "./index";
import { crewMembers, type CrewMember, type NewCrewMember } from "./schema";

export type CreateCrewMemberInput = Omit<NewCrewMember, "id" | "createdAt" | "updatedAt">;
export type UpdateCrewMemberInput = Partial<Omit<NewCrewMember, "id" | "organizationId" | "createdAt" | "updatedAt">>;

export function createCrewRepository(database: Database) {
  return {
    list(organizationId: string): Promise<CrewMember[]> {
      return database.select().from(crewMembers).where(eq(crewMembers.organizationId, organizationId)).orderBy(asc(crewMembers.name));
    },
    listSummaries(organizationId: string) {
      return database
        .select({
          id: crewMembers.id,
          name: crewMembers.name,
          defaultRole: crewMembers.defaultRole,
          email: crewMembers.email,
          status: crewMembers.status,
          avatarDataUrl: crewMembers.avatarDataUrl,
        })
        .from(crewMembers)
        .where(eq(crewMembers.organizationId, organizationId))
        .orderBy(asc(crewMembers.name));
    },
    async findById(organizationId: string, crewMemberId: string): Promise<CrewMember | null> {
      const [crewMember] = await database.select().from(crewMembers).where(and(eq(crewMembers.organizationId, organizationId), eq(crewMembers.id, crewMemberId))).limit(1);
      return crewMember ?? null;
    },
    async create(input: CreateCrewMemberInput): Promise<CrewMember> {
      const [crewMember] = await database.insert(crewMembers).values(input).returning();
      if (!crewMember) throw new Error("Failed to create crew member.");
      return crewMember;
    },
    async update(organizationId: string, crewMemberId: string, input: UpdateCrewMemberInput): Promise<CrewMember | null> {
      const [crewMember] = await database.update(crewMembers).set({ ...input, updatedAt: new Date() }).where(and(eq(crewMembers.organizationId, organizationId), eq(crewMembers.id, crewMemberId))).returning();
      return crewMember ?? null;
    },
    async remove(organizationId: string, crewMemberId: string): Promise<boolean> {
      const deleted = await database.delete(crewMembers).where(and(eq(crewMembers.organizationId, organizationId), eq(crewMembers.id, crewMemberId))).returning({ id: crewMembers.id });
      return deleted.length > 0;
    },
  };
}
