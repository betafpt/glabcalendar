import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  organizations,
  organizationMemberships,
  pendingInvitations,
  pendingShootAssignments,
  shootAssignees,
  shoots,
  notifications,
  users,
  type NewOrganizationMembership,
  type Organization,
  type OrganizationMembership,
  type User,
} from "./schema";

export const SUPER_ADMIN_EMAIL = (
  process.env.GLAB_SUPER_ADMIN_EMAIL || "betafpt@gmail.com"
).trim().toLowerCase();

export type WorkspaceWithMembership = {
  organization: Organization;
  membership: OrganizationMembership;
};

export function createWorkspaceRepository(database: Database) {
  return {
    async getUserMemberships(userId: string): Promise<WorkspaceWithMembership[]> {
      const rows = await database
        .select({
          organization: organizations,
          membership: organizationMemberships,
        })
        .from(organizationMemberships)
        .innerJoin(
          organizations,
          eq(organizationMemberships.organizationId, organizations.id)
        )
        .where(eq(organizationMemberships.userId, userId))
        .orderBy(desc(organizationMemberships.createdAt));

      return rows;
    },

    async findMembership(
      userId: string,
      organizationId: string
    ): Promise<OrganizationMembership | null> {
      const [membership] = await database
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.userId, userId),
            eq(organizationMemberships.organizationId, organizationId)
          )
        )
        .limit(1);

      return membership ?? null;
    },

    async createMembership(
      data: NewOrganizationMembership
    ): Promise<OrganizationMembership> {
      const [membership] = await database
        .insert(organizationMemberships)
        .values(data)
        .onConflictDoUpdate({
          target: [
            organizationMemberships.userId,
            organizationMemberships.organizationId,
          ],
          set: {
            role: data.role,
            updatedAt: new Date(),
          },
        })
        .returning();

      return membership;
    },

    async claimPendingInvitations(user: { id: string; email: string }): Promise<number> {
      const normalizedEmail = user.email.trim().toLowerCase();
      const pending = await database
        .select()
        .from(pendingInvitations)
        .where(
          and(
            eq(sql`lower(${pendingInvitations.email})`, normalizedEmail),
            eq(pendingInvitations.status, "pending"),
            sql`${pendingInvitations.expiresAt} > now()`
          )
        );

      let claimedCount = 0;
      for (const invite of pending) {
        await database
          .insert(organizationMemberships)
          .values({
            organizationId: invite.organizationId,
            userId: user.id,
            role: invite.role,
          })
          .onConflictDoNothing();

        await database
          .update(pendingInvitations)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(pendingInvitations.id, invite.id));

        claimedCount++;
      }

      return claimedCount;
    },

    async claimPendingShootAssignments(user: {
      id: string;
      email: string;
    }): Promise<number> {
      const normalizedEmail = user.email.trim().toLowerCase();
      const pending = await database
        .select({
          assignment: pendingShootAssignments,
          shoot: {
            id: shoots.id,
            title: shoots.title,
            startsAt: shoots.startsAt,
          },
        })
        .from(pendingShootAssignments)
        .innerJoin(shoots, eq(pendingShootAssignments.shootId, shoots.id))
        .where(eq(sql`lower(${pendingShootAssignments.email})`, normalizedEmail));

      let claimedCount = 0;
      for (const row of pending) {
        const assignment = row.assignment;

        await database
          .insert(shootAssignees)
          .values({
            shootId: assignment.shootId,
            userId: user.id,
            role: assignment.role,
            status: "pending",
            assignedBy: assignment.assignedBy,
          })
          .onConflictDoUpdate({
            target: [shootAssignees.shootId, shootAssignees.userId],
            set: {
              role: assignment.role,
              status: "pending",
              assignedBy: assignment.assignedBy,
              updatedAt: new Date(),
            },
          });

        await database.insert(notifications).values({
          organizationId: assignment.organizationId,
          userId: user.id,
          type: "EVENT_ASSIGNED",
          title: `Bạn được phân công vào buổi quay "${row.shoot.title}"`,
          message: `Bạn có một lời mời tham gia buổi quay "${row.shoot.title}" (${new Date(
            row.shoot.startsAt
          ).toLocaleDateString("vi-VN")}). Mở lịch quay để xác nhận hoặc từ chối.`,
          entityId: row.shoot.id,
          entityType: "shoot",
        });

        await database
          .delete(pendingShootAssignments)
          .where(eq(pendingShootAssignments.id, assignment.id));

        claimedCount++;
      }

      return claimedCount;
    },

    async ensureUserWorkspace(user: {
      id: string;
      email: string;
      name?: string | null;
    }): Promise<WorkspaceWithMembership> {
      const normalizedEmail = user.email.trim().toLowerCase();
      const isSuperAdminEmail = normalizedEmail === SUPER_ADMIN_EMAIL;

      if (isSuperAdminEmail) {
        // Ensure user is marked super_admin
        await database
          .update(users)
          .set({ role: "super_admin", updatedAt: new Date() })
          .where(eq(users.id, user.id));

        // Find or create G.Lab Studio
        const [glabOrg] = await database
          .select()
          .from(organizations)
          .where(eq(organizations.id, "10000000-0000-0000-0000-000000000001"))
          .limit(1);

        if (glabOrg) {
          const membership = await this.createMembership({
            organizationId: glabOrg.id,
            userId: user.id,
            role: "OWNER",
          });
          return { organization: glabOrg, membership };
        }
      }

      // Claim any invitations
      await this.claimPendingInvitations(user);
      await this.claimPendingShootAssignments(user);

      // Check existing memberships
      const memberships = await this.getUserMemberships(user.id);
      if (memberships.length > 0) {
        return memberships[0];
      }

      // If user has no workspace, create their personal workspace
      const displayName = user.name || user.email.split("@")[0] || "My Studio";
      const [newOrg] = await database
        .insert(organizations)
        .values({
          name: `${displayName}'s Studio`,
          timezone: "Asia/Ho_Chi_Minh",
        })
        .returning();

      const membership = await this.createMembership({
        organizationId: newOrg.id,
        userId: user.id,
        role: "OWNER",
      });

      return { organization: newOrg, membership };
    },

    async listOrganizationMembers(organizationId: string): Promise<
      Array<{
        id: string;
        role: "OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER";
        createdAt: Date;
        user: {
          id: string;
          name: string | null;
          email: string;
          image: string | null;
          role: "super_admin" | "user";
        };
      }>
    > {
      const rows = await database
        .select({
          id: organizationMemberships.id,
          role: organizationMemberships.role,
          createdAt: organizationMemberships.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            role: users.role,
          },
        })
        .from(organizationMemberships)
        .innerJoin(users, eq(organizationMemberships.userId, users.id))
        .where(eq(organizationMemberships.organizationId, organizationId))
        .orderBy(desc(organizationMemberships.createdAt));

      return rows;
    },

    async removeOrganizationMember(
      organizationId: string,
      userId: string
    ): Promise<boolean> {
      const result = await database
        .delete(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.userId, userId)
          )
        )
        .returning();

      return result.length > 0;
    },

    async updateMemberRole(
      organizationId: string,
      userId: string,
      role: "OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER"
    ): Promise<OrganizationMembership | null> {
      const [updated] = await database
        .update(organizationMemberships)
        .set({ role, updatedAt: new Date() })
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.userId, userId)
          )
        )
        .returning();

      return updated ?? null;
    },
  };
}
