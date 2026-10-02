import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { buildGoogleAuthUrl } from "@/server/integrations/calendar/google-calendar-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const config = getServerConfig();
    const url = new URL(request.url);

    if (!config.googleClientId || !config.googleClientSecret) {
      const redirectUrl = new URL("/integrations/google-calendar", url.origin);
      redirectUrl.searchParams.set("error", "MISSING_GOOGLE_CREDENTIALS");
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUri = `${url.origin}/api/integrations/google-calendar/callback`;
    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = buildGoogleAuthUrl({
      redirectUri,
      state,
      clientId: config.googleClientId,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const url = new URL(request.url);
    const redirectUrl = new URL("/integrations/google-calendar", url.origin);
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "CONNECT_FAILED"
    );
    return NextResponse.redirect(redirectUrl);
  }
}
