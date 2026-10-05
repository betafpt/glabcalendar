import { db } from "@/server/db";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { createGoogleCalendarSyncService } from "@/server/services/google-calendar-sync";

/**
 * Cooldown threshold in milliseconds (90 seconds).
 * Prevents calling Google Calendar API on rapid consecutive page visits or navigations.
 */
export const AUTO_PULL_COOLDOWN_MS = 90_000;

/**
 * Maximum milliseconds to wait for Google Calendar API during server-side page render.
 * Protects page load from ever blocking or timing out if Google API has network latency.
 */
export const AUTO_PULL_TIMEOUT_MS = 3_500;

export interface AutoPullResult {
  ran: boolean;
  pulledCount: number;
  reason:
    | "no_connection"
    | "disabled"
    | "cooldown"
    | "credentials_missing"
    | "timeout"
    | "success"
    | "error";
  error?: string;
}

/**
 * Automatically checks and pulls recent event changes from Google Calendar into G.Lab Calendar.
 *
 * Rules & Safeguards:
 * 1. Only runs if user has an active connection with `syncEnabled` and `syncFromGoogle`.
 * 2. Enforces a 90-second cooldown based on `lastSyncedAt`.
 * 3. Times out after 3.5s to ensure SSR render is never slowed down.
 * 4. Never throws: any error is caught and logged, returning a safe fallback result.
 */
export async function maybeAutoPullGoogleCalendar(
  organizationId: string,
  userId: string
): Promise<AutoPullResult> {
  try {
    const calendarRepo = createGoogleCalendarRepository(db);
    const conn = await calendarRepo.getUserConnection(organizationId, userId);

    if (!conn) {
      return { ran: false, pulledCount: 0, reason: "no_connection" };
    }

    if (conn.status !== "connected" || !conn.syncEnabled || !conn.syncFromGoogle) {
      return { ran: false, pulledCount: 0, reason: "disabled" };
    }

    // Check cooldown window
    if (conn.lastSyncedAt) {
      const lastSyncedTime = new Date(conn.lastSyncedAt).getTime();
      const elapsed = Date.now() - lastSyncedTime;
      if (elapsed < AUTO_PULL_COOLDOWN_MS) {
        return { ran: false, pulledCount: 0, reason: "cooldown" };
      }
    }

    // Guard if OAuth credentials are not configured in current environment
    const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
    const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
    if (!hasClientId && !hasClientSecret) {
      return { ran: false, pulledCount: 0, reason: "credentials_missing" };
    }

    // Execute with timeout guard
    const syncService = createGoogleCalendarSyncService({ db });

    const pullPromise = syncService.pullChangesFromGoogle(organizationId, userId);
    const timeoutPromise = new Promise<{ ok: boolean; pulledCount: number; timeout: true }>((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, pulledCount: 0, timeout: true }), AUTO_PULL_TIMEOUT_MS);
      // Allow Node process to exit without waiting for timer
      if (typeof timer === "object" && "unref" in timer) {
        timer.unref();
      }
    });

    const result = await Promise.race([pullPromise, timeoutPromise]);

    if ("timeout" in result && result.timeout) {
      console.warn(
        `[GoogleCalendarAutoPull] Pull timed out after ${AUTO_PULL_TIMEOUT_MS}ms for org: ${organizationId}, user: ${userId}`
      );
      return { ran: true, pulledCount: 0, reason: "timeout" };
    }

    return {
      ran: true,
      pulledCount: result.pulledCount ?? 0,
      reason: result.ok ? "success" : "error",
      error: "error" in result ? result.error : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("[GoogleCalendarAutoPull] Non-fatal auto-pull error:", errorMsg);
    return {
      ran: false,
      pulledCount: 0,
      reason: "error",
      error: errorMsg,
    };
  }
}
