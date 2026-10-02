import { afterEach, describe, expect, it, vi } from "vitest";

describe("authConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses a development secret when AUTH_SECRET is not configured locally", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "");

    const { authConfig } = await import("./auth.config");

    expect(authConfig.secret).toBe("glab-development-auth-secret-change-in-production-min32");
  });
});
