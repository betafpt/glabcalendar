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
import { revalidateTag, unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/server/cache-keys";
import { cache } from "react";

export type AuthenticatedWorkspaceContext = {
  user: User;
  organization: Organization;
  membership: OrganizationMembership;
};

export const ACTIVE_WORKSPACE_COOKIE = "glab_active_workspace_id";

async function getCachedUser(sessionUserId?: string, sessionUserEmail?: string | null) {
  const normalizedEmail = sessionUserEmail?.trim().toLowerCase();
  const identity = sessionUserId || normalizedEmail;
  if (!identity) return undefined;

  const cached = unstable_cache(
    async () => {
      if (sessionUserId) {
        const [found] = await db.select().from(users).where(eq(users.id, sessionUserId)).limit(1);
        if (found) return found;
      }
      if (normalizedEmail) {
        const [found] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
        return found;
      }
      return undefined;
    },
    [`workspace-user-${identity}`],
    { revalidate: 300, tags: [CACHE_TAGS.workspaceIdentity(identity)] }
  );
  return cached();
}

async function getCachedMemberships(userId: string) {
  const cached = unstable_cache(
    async () => createWorkspaceRepository(db).getUserMemberships(userId),
    [`workspace-memberships-${userId}`],
    { revalidate: 300, tags: [CACHE_TAGS.workspaceContext(userId)] }
  );
  return cached();
}

export function invalidateWorkspaceContext(userId: string, email?: string | null) {
  revalidateTag(CACHE_TAGS.workspaceContext(userId));
  revalidateTag(CACHE_TAGS.workspaceIdentity(userId));
  if (email) revalidateTag(CACHE_TAGS.workspaceIdentity(email));
}

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
const resolveWorkspaceContext = cache(async (
  allowRedirect: boolean
): Promise<AuthenticatedWorkspaceContext> => {
  const session = await auth();

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

  let user: User | undefined = await getCachedUser(sessionUserId, sessionUserEmail);

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
    invalidateWorkspaceContext(user.id, user.email);
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

  const memberships = await getCachedMemberships(user.id);
  let active = memberships.find((m) => m.organization.id === preferredOrgId);

  if (!active && memberships.length > 0) {
    active = memberships[0];
  }

  if (!active) {
    // Auto-provision or claim invitations
    active = await workspaceRepo.ensureUserWorkspace(user);
    invalidateWorkspaceContext(user.id, user.email);
  }

  return {
    user,
    organization: active.organization,
    membership: active.membership,
  };
});

export async function requireWorkspaceContext(options?: {
  allowRedirect?: boolean;
}): Promise<AuthenticatedWorkspaceContext> {
  return resolveWorkspaceContext(options?.allowRedirect ?? true);
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
