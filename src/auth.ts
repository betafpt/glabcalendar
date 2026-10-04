import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/server/db";
import { accounts, sessions, users, verificationTokens } from "@/server/db/schema";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  events: {
    async signIn({ user }) {
      if (user?.id && user?.email) {
        const { createWorkspaceRepository } = await import("@/server/db/workspaces");
        const workspaceRepo = createWorkspaceRepository(db);
        await workspaceRepo.ensureUserWorkspace({
          id: user.id,
          email: user.email,
          name: user.name,
        });
      }
    },
    async createUser({ user }) {
      if (user?.id && user?.email) {
        const { createWorkspaceRepository } = await import("@/server/db/workspaces");
        const workspaceRepo = createWorkspaceRepository(db);
        await workspaceRepo.ensureUserWorkspace({
          id: user.id,
          email: user.email,
          name: user.name,
        });
      }
    },
  },
});
