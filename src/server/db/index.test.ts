import { beforeEach, describe, expect, it, vi } from "vitest";

const postgresMock = vi.fn(() => ({ unsafe: vi.fn() }));

vi.mock("postgres", () => ({ default: postgresMock }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: vi.fn(() => ({ mocked: true })) }));
vi.mock("@/lib/config", () => ({
  getServerConfig: () => ({ databaseUrl: "postgresql://user:pass@example.com:5432/glab" }),
}));

describe("database client", () => {
  beforeEach(() => {
    vi.resetModules();
    postgresMock.mockClear();
    delete (globalThis as { __glabDbConn?: unknown }).__glabDbConn;
  });

  it("fails unavailable database connections quickly enough for the UI error state to render", async () => {
    await import("./index");

    expect(postgresMock).toHaveBeenCalledWith(
      "postgresql://user:pass@example.com:5432/glab",
      expect.objectContaining({ connect_timeout: 5 })
    );
  });
});
