import { getServerConfig } from "@/lib/config";
import {
  type CalendarChange,
  type CalendarInfo,
  type CalendarProvider,
  type CalendarProviderEvent,
  type PullChangesResult,
  type UserProfileInfo,
  GOOGLE_CALENDAR_SCOPES_STRING,
  GoogleApiError,
  GoogleAuthRevokedError,
} from "./types";

export interface GoogleOAuthOptions {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  state?: string;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
  idToken?: string;
}

/**
 * Builds the Google OAuth 2.0 authorization URL using minimum required scopes.
 */
export function buildGoogleAuthUrl(options: GoogleOAuthOptions): string {
  let clientId = options.clientId !== undefined ? options.clientId.trim() : undefined;
  if (clientId === undefined) {
    try {
      const config = getServerConfig();
      clientId = config.googleClientId?.trim();
    } catch {
      clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    }
  }

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES_STRING);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return url.toString();
}

/**
 * Exchanges an authorization code for Google access and refresh tokens.
 */
export async function exchangeCodeForGoogleTokens(
  code: string,
  options: { redirectUri: string; clientId?: string; clientSecret?: string }
): Promise<GoogleTokens> {
  let clientId = options.clientId !== undefined ? options.clientId.trim() : undefined;
  let clientSecret = options.clientSecret !== undefined ? options.clientSecret.trim() : undefined;

  if (clientId === undefined || clientSecret === undefined) {
    try {
      const config = getServerConfig();
      if (clientId === undefined) clientId = config.googleClientId?.trim();
      if (clientSecret === undefined) clientSecret = config.googleClientSecret?.trim();
    } catch {
      if (clientId === undefined) clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      if (clientSecret === undefined) clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    }
  }

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing.");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: options.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    const errorMsg = data.error_description || data.error || `HTTP ${response.status}`;
    throw new GoogleApiError(`Failed to exchange authorization code for tokens: ${errorMsg}`, response.status, data);
  }

  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const expiresAt = new Date(Date.now() + (expiresInSec - 60) * 1000); // 1 minute buffer

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    tokenType: data.token_type ?? "Bearer",
    scope: data.scope,
    idToken: data.id_token,
  };
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
  options?: { clientId?: string; clientSecret?: string }
): Promise<{ accessToken: string; expiresAt: Date; refreshToken?: string }> {
  let clientId = options?.clientId !== undefined ? options.clientId.trim() : undefined;
  let clientSecret = options?.clientSecret !== undefined ? options.clientSecret.trim() : undefined;

  if (clientId === undefined || clientSecret === undefined) {
    try {
      const config = getServerConfig();
      if (clientId === undefined) clientId = config.googleClientId?.trim();
      if (clientSecret === undefined) clientSecret = config.googleClientSecret?.trim();
    } catch {
      if (clientId === undefined) clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      if (clientSecret === undefined) clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    }
  }

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are missing.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant" || response.status === 400 || response.status === 401) {
      throw new GoogleAuthRevokedError(
        data.error_description || "Google authorization revoked or expired. Please reconnect."
      );
    }
    throw new GoogleApiError(`Failed to refresh Google access token: ${data.error_description || data.error}`, response.status, data);
  }

  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const expiresAt = new Date(Date.now() + (expiresInSec - 60) * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
    refreshToken: data.refresh_token, // Google sometimes returns a new refresh token
  };
}

/**
 * Revokes Google access/refresh tokens.
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (err) {
    // Non-fatal if revoke call fails
    console.warn("Google token revocation request failed:", err);
  }
}

export interface GoogleCalendarClientOptions {
  accessToken: string;
  refreshToken?: string | null;
  clientId?: string;
  clientSecret?: string;
  onTokenRefreshed?: (newAccessToken: string, expiresAt: Date, newRefreshToken?: string) => Promise<void>;
}

/**
 * Google Calendar REST API Client implementing CalendarProvider.
 */
export class GoogleCalendarClient implements CalendarProvider {
  private accessToken: string;
  private refreshToken?: string | null;
  private clientId?: string;
  private clientSecret?: string;
  private onTokenRefreshed?: (newAccessToken: string, expiresAt: Date, newRefreshToken?: string) => Promise<void>;

  constructor(options: GoogleCalendarClientOptions) {
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.onTokenRefreshed = options.onTokenRefreshed;
  }

  private async request<T>(endpoint: string, init: RequestInit = {}, isRetry = false): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `https://www.googleapis.com/calendar/v3${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers });
    } catch (networkError) {
      throw new GoogleApiError(`Network failure communicating with Google Calendar API: ${(networkError as Error).message}`);
    }

    // Handle token expiration & automatic refresh
    if (response.status === 401 && !isRetry && this.refreshToken) {
      try {
        const refreshed = await refreshGoogleAccessToken(this.refreshToken, {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        });

        this.accessToken = refreshed.accessToken;
        if (this.onTokenRefreshed) {
          await this.onTokenRefreshed(refreshed.accessToken, refreshed.expiresAt, refreshed.refreshToken);
        }

        // Retry with refreshed access token
        return this.request<T>(endpoint, init, true);
      } catch (refreshErr) {
        if (refreshErr instanceof GoogleAuthRevokedError) {
          throw refreshErr;
        }
        throw new GoogleAuthRevokedError(`Session expired and token refresh failed: ${(refreshErr as Error).message}`);
      }
    }

    if (response.status === 401) {
      throw new GoogleAuthRevokedError("Google access token is invalid or expired. Reconnection required.");
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 404 or 410 on DELETE: treat as deleted successfully
    if (init.method === "DELETE" && (response.status === 404 || response.status === 410)) {
      return undefined as T;
    }

    if (!response.ok) {
      let errorDetails: unknown = null;
      let errorMsg = `Google Calendar API returned HTTP ${response.status}`;
      try {
        errorDetails = await response.json();
        const errObj = errorDetails as { error?: { message?: string } };
        if (errObj?.error?.message) {
          errorMsg = errObj.error.message;
        }
      } catch {
        // Non-JSON response
      }

      throw new GoogleApiError(errorMsg, response.status, errorDetails);
    }

    return (await response.json()) as T;
  }

  async createEvent(
    calendarId: string,
    event: CalendarProviderEvent
  ): Promise<{ externalEventId: string; etag?: string }> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const body = {
      summary: event.summary,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: event.start,
      end: event.end,
      status: event.status ?? "confirmed",
      extendedProperties: event.extendedProperties,
    };

    const data = await this.request<{ id: string; etag?: string }>(
      `/calendars/${encodedCalendarId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return {
      externalEventId: data.id,
      etag: data.etag,
    };
  }

  async updateEvent(
    calendarId: string,
    externalEventId: string,
    event: CalendarProviderEvent
  ): Promise<{ externalEventId: string; etag?: string }> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(externalEventId);

    const body = {
      summary: event.summary,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: event.start,
      end: event.end,
      status: event.status ?? "confirmed",
      extendedProperties: event.extendedProperties,
    };

    const data = await this.request<{ id: string; etag?: string }>(
      `/calendars/${encodedCalendarId}/events/${encodedEventId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return {
      externalEventId: data.id,
      etag: data.etag,
    };
  }

  async deleteEvent(calendarId: string, externalEventId: string): Promise<void> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(externalEventId);

    await this.request<void>(`/calendars/${encodedCalendarId}/events/${encodedEventId}`, {
      method: "DELETE",
    });
  }

  async pullChanges(
    calendarId: string,
    syncToken?: string | null
  ): Promise<PullChangesResult> {
    const encodedCalendarId = encodeURIComponent(calendarId);
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: "250",
    });

    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      // Full sync: default to looking 30 days back to capture active shoots
      const defaultTimeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      params.set("timeMin", defaultTimeMin);
    }

    let rawData: {
      items?: Array<{
        id: string;
        etag?: string;
        summary?: string;
        description?: string;
        location?: string;
        status?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
        eventType?: string;
        updated?: string;
        extendedProperties?: { private?: Record<string, string> };
      }>;
      nextSyncToken?: string;
    };

    try {
      rawData = await this.request(`/calendars/${encodedCalendarId}/events?${params.toString()}`);
    } catch (err) {
      // Google returns 410 Gone if syncToken has expired or invalidated.
      // Standard Google Calendar pattern: clear syncToken and do full sync.
      if (err instanceof GoogleApiError && err.status === 410 && syncToken) {
        return this.pullChanges(calendarId, null);
      }
      throw err;
    }

    const items = rawData.items ?? [];
    const changes: CalendarChange[] = items.map((item) => {
      const isDeleted = item.status === "cancelled";
      const startIso = item.start?.dateTime || (item.start?.date ? `${item.start.date}T00:00:00Z` : new Date().toISOString());
      const endIso = item.end?.dateTime || (item.end?.date ? `${item.end.date}T23:59:59Z` : new Date().toISOString());

      const event: CalendarProviderEvent = {
        id: item.id,
        summary: item.summary ?? "(Untitled event)",
        description: item.description ?? null,
        location: item.location ?? null,
        start: { dateTime: startIso, timeZone: item.start?.timeZone },
        end: { dateTime: endIso, timeZone: item.end?.timeZone },
        status: isDeleted ? "cancelled" : (item.status === "tentative" ? "tentative" : "confirmed"),
        extendedProperties: item.extendedProperties,
        updated: item.updated,
        providerEventType: item.eventType,
      };

      return {
        eventType: isDeleted ? "deleted" : "updated",
        externalEventId: item.id,
        etag: item.etag,
        event,
        updatedAt: item.updated ? new Date(item.updated) : undefined,
      };
    });

    return {
      changes,
      nextSyncToken: rawData.nextSyncToken,
    };
  }

  async getUserInfo(): Promise<UserProfileInfo> {
    return this.request<UserProfileInfo>("https://www.googleapis.com/oauth2/v2/userinfo");
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const data = await this.request<{
      items?: Array<{
        id: string;
        summary: string;
        primary?: boolean;
        timeZone?: string;
      }>;
    }>("/users/me/calendarList");

    return (data.items ?? []).map((item) => ({
      id: item.id,
      summary: item.summary,
      primary: Boolean(item.primary),
      timeZone: item.timeZone,
    }));
  }
}
