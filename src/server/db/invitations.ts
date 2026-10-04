import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  pendingInvitations,
  users,
  type NewPendingInvitation,
  type PendingInvitation,
  type User,
} from "./schema";
import crypto from "crypto";

export type SafeUserPreview = Pick<User, "id" | "name" | "email" | "image">;

export function createInvitationsRepository(database: Database) {
  return {
    async findUserByExactEmail(email: string): Promise<SafeUserPreview | null> {
      const normalizedEmail = email.trim().toLowerCase();
      const [user] = await database
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(sql`lower(${users.email})`, normalizedEmail))
        .limit(1);

      return user ?? null;
    },

    async findUserByVerifiedPhone(phone: string): Promise<SafeUserPreview | null> {
      const normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length < 8) return null;

      const matches = await database
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(
          and(
            isNotNull(users.phoneVerified),
            sql`regexp_replace(coalesce(${users.phoneNumber}, ''), '[^0-9]', '', 'g') = ${normalizedPhone}`
          )
        )
        .limit(2);

      return matches.length === 1 ? matches[0] : null;
    },

    async listPendingForOrganization(
      organizationId: string
    ): Promise<PendingInvitation[]> {
      return database
        .select()
        .from(pendingInvitations)
        .where(
          and(
            eq(pendingInvitations.organizationId, organizationId),
            eq(pendingInvitations.status, "pending")
          )
        )
        .orderBy(desc(pendingInvitations.createdAt));
    },

    async createInvitation(
      organizationId: string,
      email: string,
      role: "OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER",
      invitedBy: string
    ): Promise<PendingInvitation> {
      const normalizedEmail = email.trim().toLowerCase();
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invitation] = await database
        .insert(pendingInvitations)
        .values({
          organizationId,
          email: normalizedEmail,
          role,
          invitedBy,
          status: "pending",
          token,
          expiresAt,
        })
        .returning();

      return invitation;
    },

    async revokeInvitation(
      id: string,
      organizationId: string
    ): Promise<boolean> {
      const result = await database
        .update(pendingInvitations)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          and(
            eq(pendingInvitations.id, id),
            eq(pendingInvitations.organizationId, organizationId)
          )
        )
        .returning({ id: pendingInvitations.id });

      return result.length > 0;
    },
  };
}
