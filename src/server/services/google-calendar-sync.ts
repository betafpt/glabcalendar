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
import { isGoogleBirthdayCalendarId } from "@/server/integrations/calendar/google-calendar-sources";

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
  userId: string,
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
        glabManaged: "true",
        glabShootId: shoot.id,
        glabUserId: userId,
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
 * Checks if a given calendar ID refers to the Google Primary Calendar (either literal 'primary' or user's email).
 */
export function isPrimaryCalendar(
  calendarId: string | null | undefined,
  accountEmail?: string | null
): boolean {
  if (!calendarId) return false;
  const normalized = calendarId.trim().toLowerCase();
  if (normalized === "primary") return true;
  if (accountEmail && normalized === accountEmail.trim().toLowerCase()) return true;
  return false;
}

/**
 * Resolves the target Google calendar ID for exporting shoots.
 * Primary Calendar Sync always exports to the signed-in user's primary calendar.
 */
export function resolveTargetCalendarId(
  _conn: GoogleCalendarConnection,
  _explicitCalendarId?: string
): string {
  return "primary";
}

/**
 * Resolves the source Google calendar IDs for importing shoots into G.Lab.
 * Primary Calendar Sync always imports from the signed-in user's primary calendar.
 */
export function resolveSourceCalendarIds(conn: GoogleCalendarConnection): string[] {
  return isGoogleBirthdayCalendarId(conn.calendarId) ? [] : ["primary"];
}

/**
 * Creates the Google Calendar synchronization service.
 */
export function createGoogleCalendarSyncService(deps: GoogleCalendarSyncServiceDeps = {}) {
  const calendarRepo = deps.repository ?? createGoogleCalendarRepository(deps.db ?? getDefaultDb());
  const shootRepo = deps.shootRepository ?? createShootRepository(deps.db ?? getDefaultDb());

  function getProviderClient(connection: GoogleCalendarConnection, userId: string): CalendarProvider {
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
        }, "primary", userId);
      },
    });
  }

  return {
    /**
     * Retrieves the active connection record for an organization.
     */
    async getConnection(organizationId: string, userId: string) {
      return calendarRepo.getUserConnection(organizationId, userId);
    },

    /**
     * Disconnects Google Calendar safely, clearing tokens and updating status.
     */
    async disconnect(organizationId: string, userId: string, calendarId = "primary"): Promise<void> {
      const conn = await calendarRepo.getUserConnection(organizationId, userId, calendarId);
      if (conn?.accessToken) {
        await revokeGoogleToken(conn.accessToken);
      }
      await calendarRepo.disconnect(organizationId, calendarId, userId);
    },

    /**
     * Updates synchronization toggles/options.
     */
    async updateSettings(
      organizationId: string,
      userId: string,
      settings: Partial<
        Pick<
          GoogleCalendarConnection,
          | "syncEnabled"
          | "syncFromGoogle"
          | "syncToGoogle"
          | "syncShoots"
          | "syncMeetings"
          | "syncLocationScout"
          | "syncInternalEvents"
          | "targetCalendarId"
          | "sourceCalendarIds"
        >
      >
    ) {
      const sanitized = { ...settings };
      if (typeof sanitized.sourceCalendarIds === "string" && sanitized.sourceCalendarIds) {
        try {
          const ids = JSON.parse(sanitized.sourceCalendarIds);
          if (Array.isArray(ids)) {
            sanitized.sourceCalendarIds = JSON.stringify(
              ids.map(String).filter((id) => !isGoogleBirthdayCalendarId(id))
            );
          }
        } catch {
          sanitized.sourceCalendarIds = sanitized.sourceCalendarIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id && !isGoogleBirthdayCalendarId(id))
            .join(",");
        }
      }
      return calendarRepo.updateSettings(organizationId, sanitized, "primary", userId);
    },

    /**
     * Lists all calendars available in the user's Google account.
     */
    async listAvailableCalendars(organizationId: string, userId: string): Promise<import("@/server/integrations/calendar/types").CalendarInfo[]> {
      const conn = await calendarRepo.getUserConnection(organizationId, userId);
      if (!conn || conn.status !== "connected" || !conn.accessToken) {
        return [];
      }
      try {
        const provider = getProviderClient(conn, userId);
        const calendars = await provider.listCalendars();
        return calendars.filter((calendar) => !isGoogleBirthdayCalendarId(calendar.id));
      } catch (err) {
        console.warn("Failed to list Google Calendars:", err);
        return [];
      }
    },

    /**
     * Pushes a single G.Lab shoot to Google Calendar.
     * Fully idempotent: duplicate calls with identical data perform no external API mutations.
     * Rule 3: Only export events with syncPolicy === "google" and isTestData === false.
     * Primary Calendar Sync exports to the user's primary calendar.
     */
    async syncShootToGoogle(
      organizationId: string,
      userId: string,
      shootId: string
    ): Promise<SyncResult> {
      try {
        const conn = await calendarRepo.getUserConnection(organizationId, userId);
        if (!conn || conn.status !== "connected" || !conn.syncEnabled || !conn.syncToGoogle) {
          return { ok: true, action: "skipped_disabled" };
        }

        const shoot = await shootRepo.findById(organizationId, shootId);
        if (!shoot) return { ok: false, action: "not_found", message: "Shoot not found." };
        if (shoot.syncPolicy !== "google" || shoot.isTestData) {
          return { ok: true, action: "skipped_disabled", message: "Buổi quay này đã được loại khỏi đồng bộ Google Calendar." };
        }

        const targetCalId = "primary";
        const provider = getProviderClient(conn, userId);
        const existingSync = await calendarRepo.getShootSync(organizationId, shootId, "google", userId);
        const currentHash = computeShootSyncHash(shoot);

        if (shoot.status === "cancelled") {
          if (existingSync && existingSync.syncStatus !== "cancelled") {
            try {
              await provider.deleteEvent(targetCalId, existingSync.externalEventId);
            } catch (err) {
              console.warn("Failed to delete cancelled G.Lab event in Google Calendar:", err);
            }
            await calendarRepo.saveShootSync({
              organizationId, userId, shootId,
              externalCalendarId: targetCalId,
              externalEventId: existingSync.externalEventId,
              externalEventEtag: existingSync.externalEventEtag,
              externalEventUpdatedAt: new Date(),
              lastSyncHash: currentHash,
              syncStatus: "cancelled",
            });
            return { ok: true, action: "cancelled", externalEventId: existingSync.externalEventId };
          }
          return { ok: true, action: "skipped_identical" };
        }

        if (existingSync && existingSync.lastSyncHash === currentHash && existingSync.syncStatus === "synced") {
          return { ok: true, action: "skipped_identical", externalEventId: existingSync.externalEventId };
        }

        const providerEvent = shootToCalendarEvent(shoot, userId);
        if (existingSync?.externalEventId) {
          const result = await provider.updateEvent(targetCalId, existingSync.externalEventId, providerEvent);
          await calendarRepo.saveShootSync({
            organizationId, userId, shootId,
            externalCalendarId: targetCalId,
            externalEventId: result.externalEventId,
            externalEventEtag: result.etag,
            externalEventUpdatedAt: result.updatedAt ?? new Date(),
            lastSyncHash: currentHash,
            syncStatus: "synced",
          });
          await shootRepo.update(organizationId, shoot.id, {
            sourceCalendarId: targetCalId,
            externalEventId: result.externalEventId,
          });
          return { ok: true, action: "updated", externalEventId: result.externalEventId };
        }

        const result = await provider.createEvent(targetCalId, providerEvent);
        await calendarRepo.saveShootSync({
          organizationId, userId, shootId,
          externalCalendarId: targetCalId,
          externalEventId: result.externalEventId,
          externalEventEtag: result.etag,
          externalEventUpdatedAt: result.updatedAt ?? new Date(),
          lastSyncHash: currentHash,
          syncStatus: "synced",
        });
        await shootRepo.update(organizationId, shoot.id, {
          sourceCalendarId: targetCalId,
          externalEventId: result.externalEventId,
        });
        return { ok: true, action: "created", externalEventId: result.externalEventId };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId, "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
            "primary", userId
          );
          return { ok: false, error: "AUTH_REVOKED", message: err.message };
        }
        const errorMsg = (err as Error).message || "Provider synchronization error.";
        await calendarRepo.updateSyncCursor(organizationId, null, "error", errorMsg, "primary", userId);
        return { ok: false, error: "PROVIDER_ERROR", message: errorMsg };
      }
    },

    async pullChangesFromGoogle(
      organizationId: string,
      userId: string
    ): Promise<{ ok: boolean; pulledCount: number; error?: string }> {
      try {
        const conn = await calendarRepo.getUserConnection(organizationId, userId);
        if (!conn || conn.status !== "connected" || !conn.syncEnabled || !conn.syncFromGoogle) {
          return { ok: true, pulledCount: 0 };
        }

        const calId = "primary";
        const provider = getProviderClient(conn, userId);
        const { changes, nextSyncToken } = await provider.pullChanges(calId, conn.nextSyncToken);
        let totalPulled = 0;

        for (const change of changes) {
          if (await calendarRepo.isExcludedEvent(organizationId, userId, change.externalEventId, calId)) continue;
          const existingSync = await calendarRepo.getSyncByExternalId(
            organizationId, change.externalEventId, "google", userId
          );

          if (change.eventType === "deleted") {
            if (!existingSync) continue;
            const shoot = await shootRepo.findById(organizationId, existingSync.shootId);
            if (!shoot) continue;
            if (shoot.syncPolicy !== "google" || shoot.isTestData) {
              await calendarRepo.saveShootSync({
                organizationId, userId, shootId: shoot.id,
                externalCalendarId: calId,
                externalEventId: change.externalEventId,
                externalEventEtag: change.etag,
                externalEventUpdatedAt: change.updatedAt ?? null,
                syncStatus: "unlinked",
              });
              continue;
            }
            if (shoot.status !== "cancelled") {
              await shootRepo.update(organizationId, shoot.id, { status: "cancelled" });
              await calendarRepo.saveShootSync({
                organizationId, userId, shootId: shoot.id,
                externalCalendarId: calId,
                externalEventId: change.externalEventId,
                externalEventEtag: change.etag,
                externalEventUpdatedAt: change.updatedAt ?? null,
                syncStatus: "cancelled",
              });
              totalPulled++;
            }
            continue;
          }

          if (!change.event) continue;
          const event = change.event;
          if (event.providerEventType === "birthday") {
            await calendarRepo.saveExcludedEvent(organizationId, userId, change.externalEventId, "birthday", calId);
            continue;
          }

          const startsAt = new Date(event.start.dateTime);
          const endsAt = new Date(event.end.dateTime);

          if (existingSync) {
            const shoot = await shootRepo.findById(organizationId, existingSync.shootId);
            if (!shoot || shoot.syncPolicy !== "google" || shoot.isTestData) continue;
            const externalUpdated = change.updatedAt?.getTime() ?? 0;
            const localUpdated = new Date(shoot.updatedAt).getTime();
            if (externalUpdated >= localUpdated) {
              const updatedShoot = await shootRepo.update(organizationId, shoot.id, {
                title: event.summary,
                startsAt,
                endsAt,
                locationName: event.location ?? shoot.locationName,
                notes: event.description ?? shoot.notes,
                sourceCalendarId: calId,
                externalEventId: change.externalEventId,
              });
              if (updatedShoot) {
                await calendarRepo.saveShootSync({
                  organizationId, userId, shootId: shoot.id,
                  externalCalendarId: calId,
                  externalEventId: change.externalEventId,
                  externalEventEtag: change.etag,
                  externalEventUpdatedAt: change.updatedAt ?? null,
                  lastSyncHash: computeShootSyncHash(updatedShoot),
                  syncStatus: "synced",
                });
                totalPulled++;
              }
            }
            continue;
          }

          const privateProps = event.extendedProperties?.private;
          const existingShootId = privateProps?.glabShootId;
          const glabUserId = privateProps?.glabUserId;
          if (privateProps?.glabManaged === "true" && glabUserId && glabUserId !== userId) {
            continue;
          }
          let targetShoot: Shoot | null = null;
          if (existingShootId && (!glabUserId || glabUserId === userId)) {
            targetShoot = await shootRepo.findById(organizationId, existingShootId);
          }

          if (targetShoot) {
            await calendarRepo.saveShootSync({
              organizationId, userId, shootId: targetShoot.id,
              externalCalendarId: calId,
              externalEventId: change.externalEventId,
              externalEventEtag: change.etag,
              externalEventUpdatedAt: change.updatedAt ?? null,
              lastSyncHash: computeShootSyncHash(targetShoot),
              syncStatus: "synced",
            });
            await shootRepo.update(organizationId, targetShoot.id, {
              sourceCalendarId: calId,
              externalEventId: change.externalEventId,
            });
            continue;
          }

          const newShoot = await shootRepo.create({
            organizationId,
            createdBy: userId,
            title: event.summary || "Lịch quay từ Google Calendar",
            status: "planned",
            startsAt, endsAt,
            locationName: event.location ?? null,
            notes: event.description ?? null,
            syncPolicy: "google",
            isTestData: false,
            sourceCalendarId: calId,
            externalEventId: change.externalEventId,
          });
          await calendarRepo.saveShootSync({
            organizationId, userId, shootId: newShoot.id,
            externalCalendarId: calId,
            externalEventId: change.externalEventId,
            externalEventEtag: change.etag,
            externalEventUpdatedAt: change.updatedAt ?? null,
            lastSyncHash: computeShootSyncHash(newShoot),
            syncStatus: "synced",
          });
          totalPulled++;
        }

        if (nextSyncToken) {
          await calendarRepo.updateSyncCursor(
            organizationId, nextSyncToken, "success",
            "Đã đồng bộ thành công lúc " + new Date().toLocaleTimeString("vi-VN") + ".",
            "primary", userId
          );
        }
        return { ok: true, pulledCount: totalPulled };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId, "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
            "primary", userId
          );
          return { ok: false, pulledCount: 0, error: "AUTH_REVOKED" };
        }
        const errorMsg = (err as Error).message || "Provider pull error.";
        await calendarRepo.updateSyncCursor(organizationId, null, "error", errorMsg, "primary", userId);
        return { ok: false, pulledCount: 0, error: errorMsg };
      }
    },

    async syncAll(organizationId: string, userId: string): Promise<SyncAllResult> {
      try {
        const conn = await calendarRepo.getUserConnection(organizationId, userId);
        if (!conn) {
          return { ok: false, pushedCount: 0, pulledCount: 0, message: "Google Calendar chưa được kết nối." };
        }
        if (conn.status === "revoked") {
          return {
            ok: false, pushedCount: 0, pulledCount: 0, error: "AUTH_REVOKED",
            message: "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
          };
        }

        let pushedCount = 0;
        if (conn.syncEnabled && conn.syncToGoogle) {
          const allShoots = await shootRepo.list(organizationId);
          const exportableShoots = allShoots.filter(
            (shoot) => shoot.syncPolicy === "google" && !shoot.isTestData
          );
          for (const shoot of exportableShoots) {
            const pushResult = await this.syncShootToGoogle(organizationId, userId, shoot.id);
            if (pushResult.ok && (pushResult.action === "created" || pushResult.action === "updated")) pushedCount++;
          }
        }

        let pulledCount = 0;
        if (conn.syncEnabled && conn.syncFromGoogle) {
          const pullResult = await this.pullChangesFromGoogle(organizationId, userId);
          pulledCount = pullResult.pulledCount;
        }

        const latestConn = await calendarRepo.getUserConnection(organizationId, userId);
        await calendarRepo.updateSyncCursor(
          organizationId,
          latestConn?.nextSyncToken ?? conn.nextSyncToken,
          "success",
          "Đã đồng bộ xong (" + pushedCount + " xuất, " + pulledCount + " nhập) lúc " + new Date().toLocaleTimeString("vi-VN") + ".",
          "primary",
          userId
        );
        return { ok: true, pushedCount, pulledCount, message: "Đồng bộ Google Calendar hoàn tất thành công." };
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await calendarRepo.updateConnectionStatus(
            organizationId, "revoked",
            "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
            "primary", userId
          );
          return {
            ok: false, pushedCount: 0, pulledCount: 0, error: "AUTH_REVOKED",
            message: "Tài khoản Google đã hết hạn hoặc bị thu hồi quyền truy cập. Vui lòng kết nối lại.",
          };
        }
        const errorMsg = (err as Error).message || "Synchronization failure.";
        await calendarRepo.updateConnectionStatus(organizationId, "error", errorMsg, "primary", userId);
        return {
          ok: false, pushedCount: 0, pulledCount: 0, error: errorMsg,
          message: "Đồng bộ thất bại: " + errorMsg,
        };
      }
    },
  };
}

export type GoogleCalendarSyncService = ReturnType<typeof createGoogleCalendarSyncService>;
