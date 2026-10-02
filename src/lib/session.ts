import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export interface SessionData {
  user: SessionUser;
  expires: string;
}

export const DEFAULT_DEMO_USER: SessionUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Đỗ Minh",
  email: "founder@glab.vn",
  image: null,
  role: "admin",
};

/**
 * Retrieves the currently active session from Auth.js auth() function.
 * In non-production environments without active session, returns deterministic demo user
 * for testability and developer experience.
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const session = await auth();
    if (session?.user?.email) {
      return {
        user: {
          id: session.user.id ?? DEFAULT_DEMO_USER.id,
          name: session.user.name ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
          role: (session.user as { role?: string }).role ?? "user",
        },
        expires: session.expires,
      };
    }
    if (process.env.NODE_ENV !== "production") {
      return {
        user: DEFAULT_DEMO_USER,
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    return null;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return {
        user: DEFAULT_DEMO_USER,
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    return null;
  }
}
