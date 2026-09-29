import { z } from "zod";

/**
 * Default application timezone matching project database design.
 */
export const DEFAULT_APP_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Validates whether a given string is a valid PostgreSQL connection URL.
 * Supports `postgresql://` and `postgres://` schemes with a host or database target.
 */
export function isValidPostgresUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  try {
    const url = new URL(value.trim());
    const hasValidProtocol = url.protocol === "postgres:" || url.protocol === "postgresql:";
    const hasDestination = url.hostname.length > 0 || (url.pathname.length > 1 && url.pathname !== "/");
    return hasValidProtocol && hasDestination;
  } catch {
    return false;
  }
}

/**
 * Validates whether a string is a valid IANA timezone identifier
 * using the standard ECMAScript Intl API.
 */
export function isValidTimezone(tz: string): boolean {
  if (typeof tz !== "string" || tz.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Schema for raw server environment variables.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL is required",
      invalid_type_error: "DATABASE_URL must be a string",
    })
    .trim()
    .min(1, "DATABASE_URL cannot be empty")
    .refine(isValidPostgresUrl, {
      message: "DATABASE_URL must be a valid PostgreSQL connection URL (e.g. postgresql://user:pass@host:5432/dbname)",
    }),
  APP_TIMEZONE: z
    .string({
      invalid_type_error: "APP_TIMEZONE must be a string",
    })
    .trim()
    .min(1, "APP_TIMEZONE cannot be empty")
    .refine(isValidTimezone, {
      message: "APP_TIMEZONE must be a valid IANA timezone identifier (e.g. Asia/Ho_Chi_Minh, UTC)",
    })
    .default(DEFAULT_APP_TIMEZONE),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type RawServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Strongly-typed validated server configuration boundary.
 */
export interface ServerConfig {
  databaseUrl: string;
  DATABASE_URL: string;
  appTimezone: string;
  APP_TIMEZONE: string;
  timezone: string;
  nodeEnv: "development" | "test" | "production";
  NODE_ENV: "development" | "test" | "production";
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Pure parsing function that validates an environment-like object.
 * Fails fast by throwing a ZodError when configuration is missing or invalid.
 * Server environment parsing must never be executed on the client.
 */
export function parseServerConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): ServerConfig {
  if (typeof window !== "undefined") {
    throw new Error("Server configuration cannot be parsed or accessed in the browser/client bundle.");
  }

  const rawDatabaseUrl = env.DATABASE_URL ?? (env as Record<string, string | undefined>).databaseUrl;
  const rawTimezone = env.APP_TIMEZONE ?? env.TIMEZONE ?? env.TZ;

  const parsed = serverEnvSchema.parse({
    DATABASE_URL: rawDatabaseUrl,
    APP_TIMEZONE: rawTimezone === undefined ? undefined : rawTimezone,
    NODE_ENV: env.NODE_ENV,
  });

  return Object.freeze({
    databaseUrl: parsed.DATABASE_URL,
    DATABASE_URL: parsed.DATABASE_URL,
    appTimezone: parsed.APP_TIMEZONE,
    APP_TIMEZONE: parsed.APP_TIMEZONE,
    timezone: parsed.APP_TIMEZONE,
    nodeEnv: parsed.NODE_ENV,
    NODE_ENV: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === "production",
    isDevelopment: parsed.NODE_ENV === "development",
    isTest: parsed.NODE_ENV === "test",
  });
}

/**
 * Alias for parseServerConfig.
 */
export const parseEnv = parseServerConfig;

let cachedConfig: ServerConfig | null = null;

/**
 * Retrieves the validated server configuration from process.env, caching the result.
 */
export function getServerConfig(): ServerConfig {
  if (!cachedConfig) {
    cachedConfig = parseServerConfig(process.env);
  }
  return cachedConfig;
}

/**
 * Resets the cached server configuration (useful in test suites).
 */
export function resetServerConfig(): void {
  cachedConfig = null;
}

/**
 * Lazy proxy to validated server configuration.
 * Avoids throwing at module load time if environment variables are not yet injected,
 * but fails fast upon first property access.
 */
export const serverConfig = new Proxy({} as ServerConfig, {
  get(target, prop: string | symbol) {
    void target;
    const currentConfig = getServerConfig();
    return Reflect.get(currentConfig, prop);
  },
});

export const config = serverConfig;
