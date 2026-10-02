import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
import { parseServerConfig } from "./src/lib/config";

loadEnvConfig(process.cwd());

/**
 * Resolves the database connection URL for Drizzle Kit commands.
 * Validates through the existing typed server environment configuration when present,
 * or falls back to the documented default local development PostgreSQL URL
 * to support offline migration artifact generation.
 */
const databaseUrl = process.env.DATABASE_URL
  ? parseServerConfig(process.env).databaseUrl
  : "postgresql://postgres:postgres@localhost:5432/glab_dev";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
