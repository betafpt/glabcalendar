import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { db } from "@/server/db";
import { createOrganizationRepository } from "@/server/db/organizations";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { createGoogleCalendarSyncService } from "@/server/services/google-calendar-sync";
import {
  exchangeCodeForGoogleTokens,
  GoogleCalendarClient,
} from "@/server/integrations/calendar/google-calendar-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const returnUrl = new URL("/integrations/google-calendar", url.origin);

  if (error) {
    returnUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(returnUrl);
  }

  if (!code) {
    returnUrl.searchParams.set("error", "MISSING_AUTHORIZATION_CODE");
    return NextResponse.redirect(returnUrl);
  }

  try {
    const config = getServerConfig();
    const redirectUri = `${url.origin}/api/integrations/google-calendar/callback`;

    // 1. Exchange authorization code for access and refresh tokens
    const tokens = await exchangeCodeForGoogleTokens(code, {
      redirectUri,
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    });

    // 2. Fetch user profile from Google to capture account email/name
    const client = new GoogleCalendarClient({
      accessToken: tokens.accessToken,
    });
    let userInfo: { email?: string; name?: string } = {};
    try {
      userInfo = await client.getUserInfo();
    } catch (err) {
      console.warn("Failed to retrieve Google userinfo:", err);
    }

    // 3. Resolve organization
    const orgRepo = createOrganizationRepository(db);
    const organization = await orgRepo.getOrCreateInitial({
      name: "G.Lab Studio",
      timezone: config.appTimezone,
    });

    // 4. Save connection record in database
    const calendarRepo = createGoogleCalendarRepository(db);
    await calendarRepo.saveConnection(organization.id, {
      calendarId: "primary",
      accountEmail: userInfo.email ?? null,
      accountName: userInfo.name ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresAt: tokens.expiresAt,
      tokenType: tokens.tokenType,
      scope: tokens.scope ?? null,
      status: "connected",
      syncEnabled: true,
      syncShoots: true,
      syncMeetings: true,
      syncLocationScout: true,
      syncInternalEvents: true,
      syncFromGoogle: true,
      syncToGoogle: true,
      lastSyncStatus: "idle",
      lastSyncMessage: "Đã kết nối thành công.",
      lastErrorAt: null,
    });

    // 5. Trigger initial background sync
    try {
      const syncService = createGoogleCalendarSyncService({ db });
      await syncService.syncAll(organization.id);
    } catch (syncErr) {
      console.warn("Initial Google Calendar sync warning:", syncErr);
    }

    returnUrl.searchParams.set("status", "connected");
    return NextResponse.redirect(returnUrl);
  } catch (err) {
    console.error("Google Calendar OAuth callback error:", err);
    returnUrl.searchParams.set(
      "error",
      err instanceof Error ? err.message : "OAUTH_CALLBACK_FAILED"
    );
    return NextResponse.redirect(returnUrl);
  }
}
