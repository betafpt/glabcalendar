import { auth } from "@/auth";
import { db } from "@/server/db";
import {
  users,
  type User,
  type Organization,
  type OrganizationMembership,
} from "@/server/db/schema";
import { createWorkspaceRepository, SUPER_ADMIN_EMAIL } from "@/server/db/workspaces";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthenticatedWorkspaceContext = {
  user: User;
  organization: Organization;
  membership: OrganizationMembership;
};

export const ACTIVE_WORKSPACE_COOKIE = "glab_active_workspace_id";

/**
 * Returns true if an error is a Next.js redirect exception that must bubble up.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Resolves the authenticated user, active workspace, and verified membership.
 * Never falls back to a global single organization for normal user requests.
 */
export async function requireWorkspaceContext(options?: {
  allowRedirect?: boolean;
}): Promise<AuthenticatedWorkspaceContext> {
  const session = await auth();
  const allowRedirect = options?.allowRedirect ?? true;

  let sessionUserId = session?.user?.id;
  let sessionUserEmail = session?.user?.email;

  // In non-production testing, support dev cookie
  if (!sessionUserId && process.env.NODE_ENV !== "production") {
    try {
      const cookieStore = cookies();
      const devEmail = cookieStore.get("glab_dev_user_email")?.value;
      if (devEmail) {
        sessionUserEmail = devEmail;
      }
    } catch {
      // ignore in non-request contexts
    }
  }

  if (!sessionUserId && !sessionUserEmail) {
    if (allowRedirect) {
      redirect("/login");
    }
    throw new Error("UNAUTHORIZED: Session required");
  }

  // Look up user in db by session.user.id or email
  let user: User | undefined;
  if (sessionUserId) {
    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUserId))
      .limit(1);
    user = found;
  }

  if (!user && sessionUserEmail) {
    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, sessionUserEmail.trim().toLowerCase()))
      .limit(1);
    user = found;
  }

  if (!user) {
    if (allowRedirect) {
      redirect("/login");
    }
    throw new Error("UNAUTHORIZED: User not found in database");
  }

  if (user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL && user.role !== "super_admin") {
    const [promotedUser] = await db
      .update(users)
      .set({ role: "super_admin", updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    if (promotedUser) user = promotedUser;
  }

  const workspaceRepo = createWorkspaceRepository(db);

  // Check if user has an active workspace cookie
  let preferredOrgId: string | undefined;
  try {
    const cookieStore = cookies();
    preferredOrgId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  } catch {
    // cookies() might not be available in non-request contexts
  }

  const memberships = await workspaceRepo.getUserMemberships(user.id);
  let active = memberships.find((m) => m.organization.id === preferredOrgId);

  if (!active && memberships.length > 0) {
    active = memberships[0];
  }

  if (!active) {
    // Auto-provision or claim invitations
    active = await workspaceRepo.ensureUserWorkspace(user);
  }

  return {
    user,
    organization: active.organization,
    membership: active.membership,
  };
}

/**
 * Verifies that the user has authorized membership in the workspace.
 * Throws an authorization error if the membership role is insufficient.
 */
export function assertWorkspacePermission(
  membership: OrganizationMembership,
  allowedRoles: Array<"OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER">
) {
  if (!allowedRoles.includes(membership.role)) {
    throw new Error(`FORBIDDEN: Insufficient permissions for role ${membership.role}`);
  }
}
