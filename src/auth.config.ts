import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible Auth.js configuration.
 * Kept free of database drivers so it can be safely evaluated in Next.js Middleware.
 */
export const authConfig = {
  secret:
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : "glab-development-auth-secret-change-in-production-min32"),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string) ?? session.user.id;
        (session.user as { role?: string }).role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
