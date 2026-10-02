import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerConfig } from "@/lib/config";
import {
  buildGoogleAuthUrl,
  exchangeCodeForGoogleTokens,
  GoogleCalendarClient,
  refreshGoogleAccessToken,
} from "./google-calendar-client";
import {
  GOOGLE_CALENDAR_MINIMUM_SCOPES,
  GoogleApiError,
  GoogleAuthRevokedError,
} from "./types";

describe("Google Calendar Provider Boundary Tests", () => {
  const originalFetch = globalThis.fetch;
  const mockClientId = "mock-client-id-123.apps.googleusercontent.com";
  const mockClientSecret = "mock-client-secret-xyz";

  beforeEach(() => {
    resetServerConfig();
    vi.stubEnv("GOOGLE_CLIENT_ID", mockClientId);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", mockClientSecret);
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetServerConfig();
  });

  describe("buildGoogleAuthUrl", () => {
    it("builds authorization URL using minimum required scopes and offline access", () => {
      const urlString = buildGoogleAuthUrl({
        redirectUri: "https://calendar.glab.vn/api/integrations/google-calendar/callback",
        state: "csrf-state-123",
        clientId: mockClientId,
      });

      const url = new URL(urlString);
      expect(url.origin).toBe("https://accounts.google.com");
      expect(url.pathname).toBe("/o/oauth2/v2/auth");
      expect(url.searchParams.get("client_id")).toBe(mockClientId);
      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://calendar.glab.vn/api/integrations/google-calendar/callback"
      );
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("access_type")).toBe("offline");
      expect(url.searchParams.get("prompt")).toBe("consent");
      expect(url.searchParams.get("state")).toBe("csrf-state-123");

      // Verify minimum scopes are requested
      const scopes = url.searchParams.get("scope") ?? "";
      for (const scope of GOOGLE_CALENDAR_MINIMUM_SCOPES) {
        expect(scopes).toContain(scope);
      }
    });

    it("throws if GOOGLE_CLIENT_ID is missing", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "");
      resetServerConfig();
      expect(() =>
        buildGoogleAuthUrl({
          redirectUri: "https://calendar.glab.vn/callback",
          clientId: "",
        })
      ).toThrow("GOOGLE_CLIENT_ID is not configured");
    });
  });

  describe("exchangeCodeForGoogleTokens", () => {
    it("exchanges authorization code for tokens successfully", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            access_token: "mock-access-token-123",
            refresh_token: "mock-refresh-token-456",
            expires_in: 3600,
            token_type: "Bearer",
            scope: "https://www.googleapis.com/auth/calendar.events",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const tokens = await exchangeCodeForGoogleTokens("auth-code-789", {
        redirectUri: "https://calendar.glab.vn/callback",
        clientId: mockClientId,
        clientSecret: mockClientSecret,
      });

      expect(tokens.accessToken).toBe("mock-access-token-123");
      expect(tokens.refreshToken).toBe("mock-refresh-token-456");
      expect(tokens.tokenType).toBe("Bearer");
      expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("throws GoogleApiError if token exchange fails", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Code expired",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      });

      await expect(
        exchangeCodeForGoogleTokens("expired-code", {
          redirectUri: "https://calendar.glab.vn/callback",
          clientId: mockClientId,
          clientSecret: mockClientSecret,
        })
      ).rejects.toThrow(GoogleApiError);
    });
  });

  describe("refreshGoogleAccessToken", () => {
    it("refreshes access token successfully", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            access_token: "new-refreshed-token",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const refreshed = await refreshGoogleAccessToken("valid-refresh-token", {
        clientId: mockClientId,
        clientSecret: mockClientSecret,
      });

      expect(refreshed.accessToken).toBe("new-refreshed-token");
      expect(refreshed.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("throws GoogleAuthRevokedError when refresh token is invalid or revoked", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been expired or revoked.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      });

      await expect(
        refreshGoogleAccessToken("revoked-token", {
          clientId: mockClientId,
          clientSecret: mockClientSecret,
        })
      ).rejects.toThrow(GoogleAuthRevokedError);
    });
  });

  describe("GoogleCalendarClient event CRUD", () => {
    it("creates an event on Google Calendar with proper headers and payload", async () => {
      interface RequestDetails {
        url: string;
        method: string;
        body: unknown;
        authHeader?: string;
      }
      let capturedRequest: RequestDetails | null = null;

      globalThis.fetch = vi.fn(async (input, init) => {
        capturedRequest = {
          url: String(input),
          method: init?.method ?? "GET",
          body: init?.body ? JSON.parse(String(init.body)) : null,
          authHeader: (init?.headers as Headers)?.get("Authorization") ?? undefined,
        };
        return new Response(
          JSON.stringify({
            id: "google-event-999",
            etag: '"etag-123"',
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const client = new GoogleCalendarClient({
        accessToken: "test-access-token",
      });

      const result = await client.createEvent("primary", {
        summary: "Lifestyle Campaign Shoot",
        start: { dateTime: "2026-10-05T09:00:00Z" },
        end: { dateTime: "2026-10-05T13:00:00Z" },
        location: "G.Lab Studio",
      });

      expect(result.externalEventId).toBe("google-event-999");
      expect(result.etag).toBe('"etag-123"');
      const requestDetails = capturedRequest as RequestDetails | null;
      expect(requestDetails?.method).toBe("POST");
      expect(requestDetails?.url).toContain("/calendars/primary/events");
      expect(requestDetails?.authHeader).toBe("Bearer test-access-token");
    });

    it("handles 401 with automatic token refresh and transparent retry", async () => {
      let callCount = 0;
      const onTokenRefreshed = vi.fn();

      globalThis.fetch = vi.fn(async (input, init) => {
        const url = String(input);

        // First call to Google API: 401 Unauthorized
        if (url.includes("/calendars/") && callCount === 0) {
          callCount++;
          return new Response(JSON.stringify({ error: { message: "Invalid Credentials" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Token refresh call to OAuth endpoint
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({
              access_token: "refreshed-token-xyz",
              expires_in: 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Retry call to Google API with new token
        callCount++;
        return new Response(
          JSON.stringify({
            id: "google-event-after-refresh",
            etag: '"etag-new"',
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const client = new GoogleCalendarClient({
        accessToken: "expired-access-token",
        refreshToken: "valid-refresh-token",
        clientId: mockClientId,
        clientSecret: mockClientSecret,
        onTokenRefreshed,
      });

      const result = await client.createEvent("primary", {
        summary: "Autumn Brand Film",
        start: { dateTime: "2026-10-06T10:00:00Z" },
        end: { dateTime: "2026-10-06T14:00:00Z" },
      });

      expect(result.externalEventId).toBe("google-event-after-refresh");
      expect(onTokenRefreshed).toHaveBeenCalledWith(
        "refreshed-token-xyz",
        expect.any(Date),
        undefined
      );
    });

    it("throws GoogleAuthRevokedError when token refresh fails with invalid_grant on 401", async () => {
      globalThis.fetch = vi.fn(async (input) => {
        const url = String(input);
        if (url.includes("/calendars/")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("oauth2.googleapis.com/token")) {
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Token revoked by user",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(null, { status: 500 });
      });

      const client = new GoogleCalendarClient({
        accessToken: "expired-access-token",
        refreshToken: "revoked-refresh-token",
        clientId: mockClientId,
        clientSecret: mockClientSecret,
      });

      await expect(
        client.createEvent("primary", {
          summary: "Revoked Shoot Test",
          start: { dateTime: "2026-10-05T09:00:00Z" },
          end: { dateTime: "2026-10-05T12:00:00Z" },
        })
      ).rejects.toThrow(GoogleAuthRevokedError);
    });

    it("treats 404 or 410 as successful deletion on deleteEvent", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: { message: "Not Found" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = new GoogleCalendarClient({
        accessToken: "test-token",
      });

      // Should not throw
      await expect(client.deleteEvent("primary", "non-existent-event")).resolves.toBeUndefined();
    });
  });

  describe("GoogleCalendarClient pullChanges", () => {
    it("pulls changes and maps deleted and updated events accurately", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "ev-1",
                summary: "Brand Shoot Day 1",
                status: "confirmed",
                start: { dateTime: "2026-10-05T09:00:00Z" },
                end: { dateTime: "2026-10-05T13:00:00Z" },
                updated: "2026-10-01T12:00:00Z",
              },
              {
                id: "ev-2",
                status: "cancelled",
                updated: "2026-10-01T13:00:00Z",
              },
            ],
            nextSyncToken: "next-sync-token-abc",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const client = new GoogleCalendarClient({ accessToken: "token" });
      const { changes, nextSyncToken } = await client.pullChanges("primary");

      expect(changes).toHaveLength(2);
      expect(changes[0].eventType).toBe("updated");
      expect(changes[0].externalEventId).toBe("ev-1");
      expect(changes[0].event?.summary).toBe("Brand Shoot Day 1");

      expect(changes[1].eventType).toBe("deleted");
      expect(changes[1].externalEventId).toBe("ev-2");
      expect(nextSyncToken).toBe("next-sync-token-abc");
    });

    it("recovers gracefully from 410 Gone (expired sync token) by doing full sync", async () => {
      let attempts = 0;
      globalThis.fetch = vi.fn(async (input) => {
        const url = String(input);
        attempts++;
        if (attempts === 1 && url.includes("syncToken=expired-cursor")) {
          return new Response(JSON.stringify({ error: { code: 410, message: "Sync token expired" } }), {
            status: 410,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            items: [],
            nextSyncToken: "fresh-sync-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const client = new GoogleCalendarClient({ accessToken: "token" });
      const result = await client.pullChanges("primary", "expired-cursor");

      expect(attempts).toBe(2);
      expect(result.nextSyncToken).toBe("fresh-sync-token");
    });
  });
});
