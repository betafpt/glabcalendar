import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  pendingShootAssignments,
  shootAssignees,
  users,
  type NewPendingShootAssignment,
  type PendingShootAssignment,
  type NewShootAssignee,
  type ShootAssignee,
  type User,
} from "./schema";

export type ShootAssigneeWithUser = {
  assignee: ShootAssignee;
  user: Pick<User, "id" | "name" | "email" | "image">;
};

export function createShootAssigneesRepository(database: Database) {
  return {
    async listPendingForShoot(shootId: string): Promise<PendingShootAssignment[]> {
      return database
        .select()
        .from(pendingShootAssignments)
        .where(eq(pendingShootAssignments.shootId, shootId))
        .orderBy(desc(pendingShootAssignments.createdAt));
    },

    async createPendingAssignment(
      data: NewPendingShootAssignment
    ): Promise<PendingShootAssignment> {
      const normalizedEmail = data.email.trim().toLowerCase();
      const [assignment] = await database
        .insert(pendingShootAssignments)
        .values({ ...data, email: normalizedEmail })
        .onConflictDoUpdate({
          target: [pendingShootAssignments.shootId, pendingShootAssignments.email],
          set: {
            role: data.role,
            assignedBy: data.assignedBy,
            updatedAt: new Date(),
          },
        })
        .returning();

      return assignment;
    },

    async removePendingAssignment(
      id: string,
      organizationId: string,
      shootId: string
    ): Promise<boolean> {
      const result = await database
        .delete(pendingShootAssignments)
        .where(
          and(
            eq(pendingShootAssignments.id, id),
            eq(pendingShootAssignments.organizationId, organizationId),
            eq(pendingShootAssignments.shootId, shootId)
          )
        )
        .returning({ id: pendingShootAssignments.id });

      return result.length > 0;
    },

    async findPendingByEmail(
      shootId: string,
      email: string
    ): Promise<PendingShootAssignment | null> {
      const normalizedEmail = email.trim().toLowerCase();
      const [assignment] = await database
        .select()
        .from(pendingShootAssignments)
        .where(
          and(
            eq(pendingShootAssignments.shootId, shootId),
            eq(sql`lower(${pendingShootAssignments.email})`, normalizedEmail)
          )
        )
        .limit(1);

      return assignment ?? null;
    },

    async findAssignee(shootId: string, userId: string): Promise<ShootAssignee | null> {
      const [assignee] = await database
        .select()
        .from(shootAssignees)
        .where(and(eq(shootAssignees.shootId, shootId), eq(shootAssignees.userId, userId)))
        .limit(1);

      return assignee ?? null;
    },

    async listAssigneesForShoot(shootId: string): Promise<ShootAssigneeWithUser[]> {
      const rows = await database
        .select({
          assignee: shootAssignees,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          },
        })
        .from(shootAssignees)
        .innerJoin(users, eq(shootAssignees.userId, users.id))
        .where(eq(shootAssignees.shootId, shootId))
        .orderBy(desc(shootAssignees.assignedAt));

      return rows;
    },

    async assignUserToShoot(data: NewShootAssignee): Promise<ShootAssignee> {
      const [assignee] = await database
        .insert(shootAssignees)
        .values(data)
        .onConflictDoUpdate({
          target: [shootAssignees.shootId, shootAssignees.userId],
          set: {
            role: data.role,
            status: data.status ?? "pending",
            updatedAt: new Date(),
          },
        })
        .returning();

      return assignee;
    },

    async updateAssigneeStatus(
      shootId: string,
      userId: string,
      status: "pending" | "accepted" | "declined"
    ): Promise<ShootAssignee | null> {
      const [updated] = await database
        .update(shootAssignees)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(shootAssignees.shootId, shootId),
            eq(shootAssignees.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    },

    async removeAssignee(shootId: string, userId: string): Promise<boolean> {
      const result = await database
        .delete(shootAssignees)
        .where(
          and(
            eq(shootAssignees.shootId, shootId),
            eq(shootAssignees.userId, userId)
          )
        )
        .returning({ id: shootAssignees.id });

      return result.length > 0;
    },
  };
}
