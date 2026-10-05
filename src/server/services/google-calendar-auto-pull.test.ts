import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));

const mockGetUserConnection = vi.fn();
vi.mock("@/server/db/google-calendar", () => ({
  createGoogleCalendarRepository: () => ({
    getUserConnection: mockGetUserConnection,
  }),
}));

const mockPullChangesFromGoogle = vi.fn();
vi.mock("@/server/services/google-calendar-sync", () => ({
  createGoogleCalendarSyncService: () => ({
    pullChangesFromGoogle: mockPullChangesFromGoogle,
  }),
}));

import { maybeAutoPullGoogleCalendar } from "./google-calendar-auto-pull";

describe("maybeAutoPullGoogleCalendar", () => {
  const orgId = "10000000-0000-0000-0000-000000000001";
  const userId = "20000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("skips and returns no_connection when user has no connection record", async () => {
    mockGetUserConnection.mockResolvedValue(null);

    const result = await maybeAutoPullGoogleCalendar(orgId, userId);
    expect(result).toEqual({ ran: false, pulledCount: 0, reason: "no_connection" });
    expect(mockPullChangesFromGoogle).not.toHaveBeenCalled();
  });

  it("skips and returns disabled when syncFromGoogle is false", async () => {
    mockGetUserConnection.mockResolvedValue({
      status: "connected",
      syncEnabled: true,
      syncFromGoogle: false,
    });

    const result = await maybeAutoPullGoogleCalendar(orgId, userId);
    expect(result).toEqual({ ran: false, pulledCount: 0, reason: "disabled" });
    expect(mockPullChangesFromGoogle).not.toHaveBeenCalled();
  });

  it("skips and returns cooldown when last sync was 30 seconds ago", async () => {
    mockGetUserConnection.mockResolvedValue({
      status: "connected",
      syncEnabled: true,
      syncFromGoogle: true,
      lastSyncedAt: new Date(Date.now() - 30_000),
    });

    const result = await maybeAutoPullGoogleCalendar(orgId, userId);
    expect(result).toEqual({ ran: false, pulledCount: 0, reason: "cooldown" });
    expect(mockPullChangesFromGoogle).not.toHaveBeenCalled();
  });

  it("skips and returns credentials_missing when Google OAuth credentials are not set in environment", async () => {
    mockGetUserConnection.mockResolvedValue({
      status: "connected",
      syncEnabled: true,
      syncFromGoogle: true,
      lastSyncedAt: new Date(Date.now() - 120_000), // 2 mins ago
    });
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    const result = await maybeAutoPullGoogleCalendar(orgId, userId);
    expect(result).toEqual({ ran: false, pulledCount: 0, reason: "credentials_missing" });
    expect(mockPullChangesFromGoogle).not.toHaveBeenCalled();
  });

  it("executes pull and returns success when cooldown passed and credentials present", async () => {
    mockGetUserConnection.mockResolvedValue({
      status: "connected",
      syncEnabled: true,
      syncFromGoogle: true,
      lastSyncedAt: new Date(Date.now() - 120_000),
    });
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id-123");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret-456");

    mockPullChangesFromGoogle.mockResolvedValue({
      ok: true,
      pulledCount: 3,
    });

    const result = await maybeAutoPullGoogleCalendar(orgId, userId);
    expect(result).toEqual({
      ran: true,
      pulledCount: 3,
      reason: "success",
      error: undefined,
    });
    expect(mockPullChangesFromGoogle).toHaveBeenCalledWith(orgId, userId);
  });
});
