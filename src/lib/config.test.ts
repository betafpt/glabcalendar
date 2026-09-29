import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import tailwindConfig from "../../tailwind.config";
import {
  DEFAULT_APP_TIMEZONE,
  isValidPostgresUrl,
  isValidTimezone,
  parseServerConfig,
  resetServerConfig,
  serverConfig,
} from "./config";

describe("tailwind.config boundary test", () => {
  it("includes content paths for app and components", () => {
    expect(Array.isArray(tailwindConfig.content)).toBe(true);
    const content = tailwindConfig.content as string[];
    expect(content).toContain("./src/app/**/*.{js,ts,jsx,tsx,mdx}");
    expect(content).toContain("./src/components/**/*.{js,ts,jsx,tsx,mdx}");
  });
});

describe("Server environment config boundary", () => {
  const validPostgresUrl = "postgresql://postgres:postgres@localhost:5432/glab_test";

  describe("Defaults", () => {
    it("uses Asia/Ho_Chi_Minh as the default application timezone", () => {
      const config = parseServerConfig({ DATABASE_URL: validPostgresUrl });
      expect(config.appTimezone).toBe(DEFAULT_APP_TIMEZONE);
      expect(config.appTimezone).toBe("Asia/Ho_Chi_Minh");
      expect(config.APP_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
      expect(config.timezone).toBe("Asia/Ho_Chi_Minh");
    });

    it("defaults NODE_ENV to development", () => {
      const config = parseServerConfig({ DATABASE_URL: validPostgresUrl });
      expect(config.nodeEnv).toBe("development");
      expect(config.NODE_ENV).toBe("development");
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.isTest).toBe(false);
    });

    it("parses valid postgres:// and postgresql:// connection strings", () => {
      const cfg1 = parseServerConfig({
        DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/mydb",
      });
      expect(cfg1.databaseUrl).toBe("postgres://user:pass@127.0.0.1:5432/mydb");
      expect(cfg1.DATABASE_URL).toBe("postgres://user:pass@127.0.0.1:5432/mydb");

      const cfg2 = parseServerConfig({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/glab_dev?sslmode=disable",
      });
      expect(cfg2.databaseUrl).toBe("postgresql://user:pass@localhost:5432/glab_dev?sslmode=disable");
    });
  });

  describe("Environment overrides", () => {
    it("allows overriding timezone via APP_TIMEZONE", () => {
      const config = parseServerConfig({
        DATABASE_URL: validPostgresUrl,
        APP_TIMEZONE: "UTC",
      });
      expect(config.appTimezone).toBe("UTC");
      expect(config.APP_TIMEZONE).toBe("UTC");
      expect(config.timezone).toBe("UTC");
    });

    it("allows overriding timezone via TIMEZONE or TZ fallback", () => {
      const cfgFromTimezone = parseServerConfig({
        DATABASE_URL: validPostgresUrl,
        TIMEZONE: "America/New_York",
      });
      expect(cfgFromTimezone.appTimezone).toBe("America/New_York");

      const cfgFromTz = parseServerConfig({
        DATABASE_URL: validPostgresUrl,
        TZ: "Europe/London",
      });
      expect(cfgFromTz.appTimezone).toBe("Europe/London");
    });

    it("allows overriding NODE_ENV to production and test", () => {
      const prodConfig = parseServerConfig({
        DATABASE_URL: validPostgresUrl,
        NODE_ENV: "production",
      });
      expect(prodConfig.nodeEnv).toBe("production");
      expect(prodConfig.isProduction).toBe(true);
      expect(prodConfig.isDevelopment).toBe(false);

      const testConfig = parseServerConfig({
        DATABASE_URL: validPostgresUrl,
        NODE_ENV: "test",
      });
      expect(testConfig.nodeEnv).toBe("test");
      expect(testConfig.isTest).toBe(true);
      expect(testConfig.isDevelopment).toBe(false);
    });
  });

  describe("Invalid server configuration (fail-fast)", () => {
    it("throws when DATABASE_URL is missing", () => {
      expect(() => parseServerConfig({})).toThrow(ZodError);
    });

    it("throws when DATABASE_URL is empty or whitespace", () => {
      expect(() => parseServerConfig({ DATABASE_URL: "" })).toThrow(ZodError);
      expect(() => parseServerConfig({ DATABASE_URL: "   " })).toThrow(ZodError);
    });

    it("throws when DATABASE_URL is not a valid PostgreSQL URL", () => {
      expect(() => parseServerConfig({ DATABASE_URL: "not-a-valid-url" })).toThrow(ZodError);
      expect(() => parseServerConfig({ DATABASE_URL: "http://localhost:5432/db" })).toThrow(ZodError);
      expect(() => parseServerConfig({ DATABASE_URL: "mysql://user:pass@localhost:3306/db" })).toThrow(ZodError);
      expect(() => parseServerConfig({ DATABASE_URL: "postgresql://" })).toThrow(ZodError);
      expect(() => parseServerConfig({ DATABASE_URL: "postgresql:///" })).toThrow(ZodError);
    });

    it("throws when APP_TIMEZONE is not a valid IANA timezone", () => {
      expect(() =>
        parseServerConfig({
          DATABASE_URL: validPostgresUrl,
          APP_TIMEZONE: "Invalid/Not_A_Real_Timezone",
        })
      ).toThrow(ZodError);

      expect(() =>
        parseServerConfig({
          DATABASE_URL: validPostgresUrl,
          APP_TIMEZONE: "GMT+99",
        })
      ).toThrow(ZodError);
    });

    it("throws when NODE_ENV is invalid", () => {
      expect(() =>
        parseServerConfig({
          DATABASE_URL: validPostgresUrl,
          NODE_ENV: "staging" as unknown as "development",
        })
      ).toThrow(ZodError);
    });
  });

  describe("URL and Timezone validation helpers", () => {
    it("validates postgres connection URLs accurately", () => {
      expect(isValidPostgresUrl("postgresql://user:pass@localhost:5432/mydb")).toBe(true);
      expect(isValidPostgresUrl("postgres://localhost/mydb")).toBe(true);
      expect(isValidPostgresUrl("postgresql:///mydb")).toBe(true);
      expect(isValidPostgresUrl("")).toBe(false);
      expect(isValidPostgresUrl("   ")).toBe(false);
      expect(isValidPostgresUrl("https://example.com")).toBe(false);
      expect(isValidPostgresUrl("mysql://user:pass@localhost:3306/db")).toBe(false);
      expect(isValidPostgresUrl("postgresql://")).toBe(false);
    });

    it("validates IANA timezones accurately", () => {
      expect(isValidTimezone("Asia/Ho_Chi_Minh")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("   ")).toBe(false);
      expect(isValidTimezone("Invalid/Unknown_Zone")).toBe(false);
    });
  });

  describe("serverConfig proxy and cache behavior", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      resetServerConfig();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      resetServerConfig();
      process.env = originalEnv;
    });

    it("fails fast when process.env.DATABASE_URL is missing upon accessing serverConfig", () => {
      delete process.env.DATABASE_URL;
      expect(() => serverConfig.databaseUrl).toThrow(ZodError);
    });

    it("resolves properties when process.env contains valid configuration", () => {
      process.env.DATABASE_URL = validPostgresUrl;
      delete process.env.APP_TIMEZONE;
      expect(serverConfig.databaseUrl).toBe(validPostgresUrl);
      expect(serverConfig.appTimezone).toBe("Asia/Ho_Chi_Minh");
    });
  });

  describe("Client bundle guard", () => {
    it("throws when accessed in browser/client environment", () => {
      const globalWithWindow = globalThis as unknown as { window?: unknown };
      const originalWindow = globalWithWindow.window;
      try {
        globalWithWindow.window = {};
        expect(() => parseServerConfig({ DATABASE_URL: validPostgresUrl })).toThrow(
          "Server configuration cannot be parsed or accessed in the browser/client bundle."
        );
      } finally {
        if (originalWindow === undefined) {
          delete globalWithWindow.window;
        } else {
          globalWithWindow.window = originalWindow;
        }
      }
    });
  });
});
