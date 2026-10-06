import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerConfig } from "@/lib/config";
import * as schema from "./schema";

// Server-only guard to ensure database connections are never bundled or executed in the browser
if (typeof window !== "undefined") {
  throw new Error("Database client cannot be imported or executed in the browser.");
}

/**
 * Global singleton reference preserving the Postgres client connection
 * across Next.js hot module replacement (HMR) reloads in development.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const databaseUrl = getServerConfig().databaseUrl;
const usesTransactionPooler = /pooler\.supabase\.com:6543(?:\/|$)/i.test(databaseUrl);

export const conn =
  globalForDb.conn ??
  postgres(databaseUrl, {
    // Vercel can create many short-lived function instances. Keep each instance
    // to one backend connection and give the remote pooler enough time to accept it.
    max: 1,
    connect_timeout: 15,
    idle_timeout: 20,
    prepare: !usesTransactionPooler,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const client = conn;

export const db = drizzle(conn, { schema });

export { schema };
export type Database = typeof db;
