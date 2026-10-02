import { and, eq } from "drizzle-orm";
import type { Database } from "./index";
import {
  accounts,
  sessions,
  users,
  type Account,
  type NewAccount,
  type NewSession,
  type NewUser,
  type Session,
  type User,
} from "./schema";

export function createAuthRepository(database: Database) {
  return {
    async findUserById(id: string): Promise<User | null> {
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user ?? null;
    },

    async findUserByEmail(email: string): Promise<User | null> {
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);
      return user ?? null;
    },

    async createUser(input: NewUser): Promise<User> {
      const [user] = await database
        .insert(users)
        .values({
          ...input,
          email: input.email.trim().toLowerCase(),
        })
        .returning();
      if (!user) throw new Error("Failed to create user.");
      return user;
    },

    async getOrCreateUser(input: {
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
    }): Promise<User> {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existing = await this.findUserByEmail(normalizedEmail);
      if (existing) {
        if (input.name && !existing.name) {
          const [updated] = await database
            .update(users)
            .set({ name: input.name, image: input.image ?? existing.image, updatedAt: new Date() })
            .where(eq(users.id, existing.id))
            .returning();
          return updated ?? existing;
        }
        return existing;
      }
      return this.createUser({
        email: normalizedEmail,
        name: input.name ?? null,
        image: input.image ?? null,
        role: input.role ?? "user",
      });
    },

    async findSession(sessionToken: string): Promise<{ session: Session; user: User } | null> {
      const [row] = await database
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);
      return row ?? null;
    },

    async createSession(input: NewSession): Promise<Session> {
      const [session] = await database
        .insert(sessions)
        .values(input)
        .returning();
      if (!session) throw new Error("Failed to create session.");
      return session;
    },

    async deleteSession(sessionToken: string): Promise<boolean> {
      const deleted = await database
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .returning({ token: sessions.sessionToken });
      return deleted.length > 0;
    },

    async findAccount(provider: string, providerAccountId: string): Promise<Account | null> {
      const [account] = await database
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        )
        .limit(1);
      return account ?? null;
    },

    async linkAccount(input: NewAccount): Promise<Account> {
      const [account] = await database
        .insert(accounts)
        .values(input)
        .returning();
      if (!account) throw new Error("Failed to link account.");
      return account;
    },
  };
}
