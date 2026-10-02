import type { Database } from "@/server/db";
import { createShootRepository } from "@/server/db/shoots";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import {
  GoogleCalendarClient,
  revokeGoogleToken,
} from "@/server/integrations/calendar/google-calendar-client";
import {
  type CalendarProvider,
  type CalendarProviderEvent,
  GoogleAuthRevokedError,
} from "@/server/integrations/calendar/types";
import type { Shoot, GoogleCalendarConnection } from "@/server/db/schema";

/**
 * Computes a deterministic hash of shoot fields relevant for calendar synchronization.
 * Prevents redundant updates and eliminates infinite synchronization loops.
 */
export function computeShootSyncHash(shoot: {
  title: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  locationName?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}): string {
  const content = [
    shoot.title.trim(),
    shoot.status.trim(),
    new Date(shoot.startsAt).toISOString(),
    new Date(shoot.endsAt).toISOString(),
    shoot.locationName?.trim() ?? "",
    shoot.locationAddress?.trim() ?? "",
    shoot.notes?.trim() ?? "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Transforms a G.Lab shoot into a Google Calendar event payload.
 */
export function shootToCalendarEvent(
  shoot: Shoot,
  timeZone = "Asia/Ho_Chi_Minh"
): CalendarProviderEvent {
  const locationParts = [shoot.locationName, shoot.locationAddress]
    .filter(Boolean)
    .map((s) => s?.trim());
  const location = locationParts.length > 0 ? locationParts.join(" — ") : undefined;

  const descriptionParts: string[] = [];
  if (shoot.notes) {
    descriptionParts.push(shoot.notes.trim());
  }
  descriptionParts.push(`\n[G.Lab Calendar: Shoot ID: ${shoot.id}]`);
  if (shoot.callTime) {
    const callTimeStr = new Intl.DateTimeFormat("en", {
      timeStyle: "short",
      dateStyle: "short",
      timeZone,
    }).format(new Date(shoot.callTime));
    descriptionParts.push(`Call time: ${callTimeStr}`);
  }

  return {
    summary: shoot.title,
    description: descriptionParts.join("\n"),
    location,
    start: {
      dateTime: new Date(shoot.startsAt).toISOString(),
      timeZone,
    },
    end: {
      dateTime: new Date(shoot.endsAt).toISOString(),
      timeZone,
    },
    status: shoot.status === "cancelled" ? "cancelled" : "confirmed",
    extendedProperties: {
      private: {
        glabShootId: shoot.id,
        glabOrganizationId: shoot.organizationId,
      },
    },
  };
}

export interface SyncResult {
  ok: boolean;
  action?: "created" | "updated" | "cancelled" | "skipped_identical" | "skipped_disabled" | "not_found";
  error?: string;
  message?: string;
  externalEventId?: string;
}

export interface SyncAllResult {
  ok: boolean;
  pushedCount: number;
  pulledCount: number;
  message?: string;
  error?: string;
}

export interface GoogleCalendarSyncServiceDeps {
  db?: Database;
  repository?: ReturnType<typeof createGoogleCalendarRepository>;
  shootRepository?: ReturnType<typeof createShootRepository>;
  createProvider?: (conn: GoogleCalendarConnection) => CalendarProvider;
}

function getDefaultDb(): Database {
  return require("@/server/db").db as Database;
}

/**
 * Creates the Google Calendar synchronization service.
 */
export function createGoogleCalendarSyncService(deps: GoogleCalendarSyncServiceDeps = {}) {
  const calendarRepo = deps.repository ?? createGoogleCalendarRepository(deps.db ?? getDefaultDb());
  const shootRepo = deps.shootRepository ?? createShootRepository(deps.db ?? getDefaultDb());

  function getProviderClient(connection: GoogleCalendarConnection): CalendarProvider {
    if (deps.createProvider) {
      return deps.createProvider(connection);
    }

    if (!connection.accessToken) {
      throw new GoogleAuthRevokedError("No access token present. Google Calendar is not connected.");
    }

    return new GoogleCalendarClient({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      onTokenRefreshed: async (newAccessToken, expiresAt, newRefreshToken) => {
        await calendarRepo.updateTokens(connection.organizationId, {
          accessToken: newAccessToken,
          expiresAt,
          refreshToken: newRefreshToken,
        });
      },
    });
  }

  return {
    /**
     * Retrieves the active connection record for an organization.
     */
    async getConnection(organizationId: string) {
      return calendarRepo.getConnection(organizationId);
    },

    /**
     * Disconnects Google Calendar safely, clearing tokens and updating status.
     */
    async disconnect(organizationId: string, calendarId = "primary"): Promise<void> {
      const conn = await calendarRepo.getConnection(organizationId, calendarId);
      if (conn?.accessToken) {
        await revokeGoogleToken(conn.accessToken);
      }
      await calendarRepo.disconnect(organizationId, calendarId);
    },

    /**
     * Updates synchronization toggles/options.
     */
    async updateSettings(
      organizationId: string,
      settings: Partial<
        Pick<
          GoogleCalendarConnection,
          | "syncFromGoogle"
          | "syncToGoogle"
          | "syncShoots"
          | "syncMeetings"
          | "syncLocationScout"
          | "syncInternalEvents"
        >
      >
    ) {
      return calendarRepo.updateSettings(organizationId, settings);
    },

    /**
     * Pushes a single G.Lab shoot to Google Calendar.
     * Fully idempotent: duplicate calls with identical data perform no external API mutations.
     */
    async syncShootToGoogle(
      organizationId: string,
      shootId: string,
      calendarId = "primary"
    ): Promise<SyncResult> {
      try {
        const conn = await calendarRepo.getConnection(organizationId, calendarId);
        if (!conn || conn.status !== "connected" || !conn.syncEnabled || !conn.syncToGoogle) {
          return { ok: true, action: "skipped_disabled" };
        }

        const shoot = await shootRepo.findById(organizationId, shootId);
        if (!shoot) {
          return { ok: false, action: "not_found", message: "Shoot not found." };
        }

        const provider = getProviderClient(conn);
        const existingSync = await calendarRepo.getShootSync(organizationId, shootId);
        const currentHash = computeShootSyncHash(shoot);

        // Handle Shoot Cancellation
        if (shoot.status === "cancelled") {
          if (existingSync && existingSync.syncStatus !== "cancelled") {
            try {
              await provider.deleteEvent(conn.calendarId, existingSync.externalEventId);
            } catch (err) {
              console.warn("Failed to delete cancelled event in Google Calendar:", err);
            }
            await calendarRepo.saveShootSync({
              organizationId,
              shootId,
              externalCalendarId: conn.calendarId,
              externalEventId: existingSync.externalEventId,
              lastSyncHash: currentHash,
              syncStatus: "cancelled",
            });
            return { ok: true, action: "cancelled", externalEventId: existingSync.externalEventId };
          }
          return { ok: true, action: "skipped_identical" };
        }

        // Idempotency check: if unchanged, skip mutation
        if (
          existingSync &&
          existingSync.lastSyncHash === currentHash &&
          existingSync.syncStatus === "synced"
        ) {
          return { ok: true, action: "skipped_identical", externalEventId: existingSync.externalEventId };
        }

        const providerEvent = shootToCalendarEvent(shoot);

        if (existingSync && existingSync.externalEventId) {
          // Update existing event on Google Calendar
          const result = await provider.updateEvent(
            conn.calendarId,
            existingSync.externalEventId,
            providerEvent
          );

          await calendarRepo.saveShootSync({
            organizationId,
            shootId,
            externalCalendarId: conn.calendarId,
            externalEventId: result.externalEventId,
            externalEventEtag: result.etag,
            lastSyncHash: currentHash,
            syncStatus: "synced",
          });

          return { ok: true, action: "updated", externalEventId: result.externalEventId };
        }

        // Create new event on Google Calendar
        const result = await provider.createEvent(conn.calendarId, providerEvent);

        await calendarRepo.saveShootSync({
          organizationId,
          shootId,
          externalCalendarId: conn.calendarId,
          externalEventId: result.externalEventId,
          externalEventEtag: result.etag,
          lastSyncHash: currentHash,
          syncStatus: "synced",
        });

        return { ok: true, action: "created", externalEventId: result.externalEventId };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId,
            "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại."
          );
          return { ok: false, error: "AUTH_REVOKED", message: err.message };
        }

        const errorMsg = (err as Error).message || "Provider synchronization error.";
        await calendarRepo.updateSyncCursor(organizationId, null, "error", errorMsg);
        return { ok: false, error: "PROVIDER_ERROR", message: errorMsg };
      }
    },

    /**
     * Pulls event changes from Google Calendar back into G.Lab.
     * Reconciles conflicts according to the explicit rules:
     * - G.Lab is source-of-truth for crew/gear/checklists
     * - Last-write-wins for timing & title
     * - Deletions in Google mark G.Lab shoot as 'cancelled'
     * - Unmatched Google events create new 'planned' shoots without duplicating
     */
    async pullChangesFromGoogle(
      organizationId: string,
      calendarId = "primary"
    ): Promise<{ ok: boolean; pulledCount: number; error?: string }> {
      try {
        const conn = await calendarRepo.getConnection(organizationId, calendarId);
        if (!conn || conn.status !== "connected" || !conn.syncEnabled || !conn.syncFromGoogle) {
          return { ok: true, pulledCount: 0 };
        }

        const provider = getProviderClient(conn);
        const { changes, nextSyncToken } = await provider.pullChanges(
          conn.calendarId,
          conn.nextSyncToken
        );

        let pulledCount = 0;

        for (const change of changes) {
          const existingSync = await calendarRepo.getSyncByExternalId(
            organizationId,
            change.externalEventId
          );

          if (change.eventType === "deleted") {
            if (existingSync) {
              const shoot = await shootRepo.findById(organizationId, existingSync.shootId);
              if (shoot && shoot.status !== "cancelled") {
                // Rule 3: External cancellation updates G.Lab status to 'cancelled'
                await shootRepo.update(organizationId, shoot.id, {
                  status: "cancelled",
                });
                await calendarRepo.saveShootSync({
                  organizationId,
                  shootId: shoot.id,
                  externalCalendarId: conn.calendarId,
                  externalEventId: change.externalEventId,
                  syncStatus: "cancelled",
                });
                pulledCount++;
              }
            }
            continue;
          }

          if (!change.event) continue;

          const event = change.event;
          if (event.providerEventType === "birthday") continue;
          const startsAt = new Date(event.start.dateTime);
          const endsAt = new Date(event.end.dateTime);

          if (existingSync) {
            // Reconcile existing shoot
            const shoot = await shootRepo.findById(organizationId, existingSync.shootId);
            if (shoot) {
              // Rule 2: Last-write-wins timing reconciliation
              const externalUpdated = change.updatedAt?.getTime() ?? 0;
              const localUpdated = new Date(shoot.updatedAt).getTime();

              if (externalUpdated >= localUpdated) {
                const updatedShoot = await shootRepo.update(organizationId, shoot.id, {
                  title: event.summary,
                  startsAt,
                  endsAt,
                  locationName: event.location ?? shoot.locationName,
                  notes: event.description ?? shoot.notes,
                });

                if (updatedShoot) {
                  await calendarRepo.saveShootSync({
                    organizationId,
                    shootId: shoot.id,
                    externalCalendarId: conn.calendarId,
                    externalEventId: change.externalEventId,
                    externalEventEtag: change.etag,
                    lastSyncHash: computeShootSyncHash(updatedShoot),
                    syncStatus: "synced",
                  });
                  pulledCount++;
                }
              }
            }
          } else {
            // Rule 4: New external Google event imported as planned shoot
            // Check if private properties contain glabShootId to prevent duplicate creation
            const existingShootId = event.extendedProperties?.private?.glabShootId;
            let targetShoot: Shoot | null = null;

            if (existingShootId) {
              targetShoot = await shootRepo.findById(organizationId, existingShootId);
            }

            if (targetShoot) {
              await calendarRepo.saveShootSync({
                organizationId,
                shootId: targetShoot.id,
                externalCalendarId: conn.calendarId,
                externalEventId: change.externalEventId,
                externalEventEtag: change.etag,
                lastSyncHash: computeShootSyncHash(targetShoot),
                syncStatus: "synced",
              });
            } else {
              const newShoot = await shootRepo.create({
                organizationId,
                title: event.summary || "Lịch quay từ Google Calendar",
                status: "planned",
                startsAt,
                endsAt,
                locationName: event.location ?? null,
                notes: event.description ?? null,
              });

              await calendarRepo.saveShootSync({
                organizationId,
                shootId: newShoot.id,
                externalCalendarId: conn.calendarId,
                externalEventId: change.externalEventId,
                externalEventEtag: change.etag,
                lastSyncHash: computeShootSyncHash(newShoot),
                syncStatus: "synced",
              });
              pulledCount++;
            }
          }
        }

        // Persist sync cursor safely
        await calendarRepo.updateSyncCursor(
          organizationId,
          nextSyncToken ?? conn.nextSyncToken,
          "success",
          `Đã đồng bộ thành công lúc ${new Date().toLocaleTimeString("vi-VN")}.`
        );

        return { ok: true, pulledCount };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId,
            "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại."
          );
          return { ok: false, pulledCount: 0, error: "AUTH_REVOKED" };
        }

        const errorMsg = (err as Error).message || "Provider pull error.";
        await calendarRepo.updateSyncCursor(organizationId, null, "error", errorMsg);
        return { ok: false, pulledCount: 0, error: errorMsg };
      }
    },

    /**
     * Executes bidirectional synchronization for all shoots.
     * Retries and duplicate sync calls are completely safe and idempotent.
     */
    async syncAll(organizationId: string, calendarId = "primary"): Promise<SyncAllResult> {
      try {
        const conn = await calendarRepo.getConnection(organizationId, calendarId);
        if (!conn) {
          return { ok: false, pushedCount: 0, pulledCount: 0, message: "Google Calendar chưa được kết nối." };
        }

        if (conn.status === "revoked") {
          return {
            ok: false,
            pushedCount: 0,
            pulledCount: 0,
            error: "AUTH_REVOKED",
            message: "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
          };
        }

        let pushedCount = 0;

        // 1. Push shoots to Google if enabled
        if (conn.syncEnabled && conn.syncToGoogle) {
          const allShoots = await shootRepo.list(organizationId);
          for (const shoot of allShoots) {
            const pushResult = await this.syncShootToGoogle(organizationId, shoot.id, calendarId);
            if (pushResult.ok && (pushResult.action === "created" || pushResult.action === "updated")) {
              pushedCount++;
            }
          }
        }

        // 2. Pull changes from Google if enabled
        let pulledCount = 0;
        if (conn.syncEnabled && conn.syncFromGoogle) {
          const pullResult = await this.pullChangesFromGoogle(organizationId, calendarId);
          pulledCount = pullResult.pulledCount;
        }

        const latestConn = await calendarRepo.getConnection(organizationId, calendarId);
        await calendarRepo.updateSyncCursor(
          organizationId,
          latestConn?.nextSyncToken ?? conn.nextSyncToken,
          "success",
          `Đã đồng bộ xong (${pushedCount} xuất, ${pulledCount} nhập) lúc ${new Date().toLocaleTimeString("vi-VN")}.`
        );

        return {
          ok: true,
          pushedCount,
          pulledCount,
          message: "Đồng bộ Google Calendar hoàn tất thành công.",
        };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId,
            "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại."
          );
          return {
            ok: false,
            pushedCount: 0,
            pulledCount: 0,
            error: "AUTH_REVOKED",
            message: "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
          };
        }

        const errorMsg = (err as Error).message || "Synchronization failure.";
        await calendarRepo.updateConnectionStatus(organizationId, "error", errorMsg);
        return {
          ok: false,
          pushedCount: 0,
          pulledCount: 0,
          error: errorMsg,
          message: `Đồng bộ thất bại: ${errorMsg}`,
        };
      }
    },
  };
}

export type GoogleCalendarSyncService = ReturnType<typeof createGoogleCalendarSyncService>;
