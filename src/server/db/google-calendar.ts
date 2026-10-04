import { and, eq } from "drizzle-orm";
import type { Database } from "./index";
import {
  googleCalendarConnections,
  excludedGoogleCalendarEvents,
  shootCalendarSync,
  type GoogleCalendarConnection,
  type NewGoogleCalendarConnection,
  type NewShootCalendarSync,
  type ShootCalendarSync,
} from "./schema";

export function createGoogleCalendarRepository(database: Database) {
  return {
    async getConnection(
      organizationId: string,
      calendarId = "primary",
      userId?: string | null
    ): Promise<GoogleCalendarConnection | null> {
      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId !== undefined && userId !== null) {
        conditions.push(eq(googleCalendarConnections.userId, userId));
      }
      const [conn] = await database
        .select()
        .from(googleCalendarConnections)
        .where(and(...conditions))
        .limit(1);

      return conn ?? null;
    },

    async getUserConnection(
      organizationId: string,
      userId: string,
      calendarId = "primary"
    ): Promise<GoogleCalendarConnection | null> {
      const [conn] = await database
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            eq(googleCalendarConnections.organizationId, organizationId),
            eq(googleCalendarConnections.userId, userId),
            eq(googleCalendarConnections.calendarId, calendarId)
          )
        )
        .limit(1);

      return conn ?? null;
    },

    async saveConnection(
      organizationId: string,
      data: Omit<NewGoogleCalendarConnection, "id" | "organizationId" | "createdAt" | "updatedAt">
    ): Promise<GoogleCalendarConnection> {
      const calendarId = data.calendarId ?? "primary";
      const existing = data.userId
        ? await this.getUserConnection(organizationId, data.userId, calendarId)
        : await this.getConnection(organizationId, calendarId);

      if (existing) {
        const [updated] = await database
          .update(googleCalendarConnections)
          .set({
            ...data,
            calendarId,
            updatedAt: new Date(),
          })
          .where(eq(googleCalendarConnections.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await database
        .insert(googleCalendarConnections)
        .values({
          ...data,
          organizationId,
          calendarId,
        })
        .returning();
      return created;
    },

    async updateTokens(
      organizationId: string,
      tokens: { accessToken: string; expiresAt: Date; refreshToken?: string },
      calendarId = "primary",
      userId?: string | null
    ): Promise<void> {
      const updateData: Partial<NewGoogleCalendarConnection> = {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
        status: "connected",
        updatedAt: new Date(),
      };
      if (tokens.refreshToken) {
        updateData.refreshToken = tokens.refreshToken;
      }

      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId) conditions.push(eq(googleCalendarConnections.userId, userId));

      await database
        .update(googleCalendarConnections)
        .set(updateData)
        .where(and(...conditions));
    },

    async updateSyncCursor(
      organizationId: string,
      nextSyncToken: string | null,
      status = "success",
      message?: string,
      calendarId = "primary",
      userId?: string | null
    ): Promise<void> {
      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId) conditions.push(eq(googleCalendarConnections.userId, userId));
      await database
        .update(googleCalendarConnections)
        .set({
          nextSyncToken,
          lastSyncedAt: new Date(),
          lastSyncStatus: status,
          lastSyncMessage: message ?? null,
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    },

    async updateConnectionStatus(
      organizationId: string,
      status: "connected" | "disconnected" | "revoked" | "error",
      message?: string,
      calendarId = "primary",
      userId?: string | null
    ): Promise<void> {
      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId) conditions.push(eq(googleCalendarConnections.userId, userId));
      await database
        .update(googleCalendarConnections)
        .set({
          status,
          lastSyncStatus: status === "error" || status === "revoked" ? "error" : "idle",
          lastSyncMessage: message ?? null,
          lastErrorAt: status === "error" || status === "revoked" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    },

    async disconnect(organizationId: string, calendarId = "primary", userId?: string | null): Promise<void> {
      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId) {
        conditions.push(eq(googleCalendarConnections.userId, userId));
      }
      await database
        .update(googleCalendarConnections)
        .set({
          status: "disconnected",
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          nextSyncToken: null,
          lastSyncStatus: "idle",
          lastSyncMessage: "Đã ngắt kết nối Google Calendar.",
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    },

    async updateSettings(
      organizationId: string,
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
      >,
      calendarId = "primary",
      userId?: string | null
    ): Promise<GoogleCalendarConnection | null> {
      const conditions = [
        eq(googleCalendarConnections.organizationId, organizationId),
        eq(googleCalendarConnections.calendarId, calendarId),
      ];
      if (userId) {
        conditions.push(eq(googleCalendarConnections.userId, userId));
      }
      const [updated] = await database
        .update(googleCalendarConnections)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(and(...conditions))
        .returning();

      return updated ?? null;
    },

    async getShootSync(
      organizationId: string,
      shootId: string,
      provider = "google",
      userId?: string | null
    ): Promise<ShootCalendarSync | null> {
      const conditions = [
        eq(shootCalendarSync.organizationId, organizationId),
        eq(shootCalendarSync.shootId, shootId),
        eq(shootCalendarSync.provider, provider),
      ];
      if (userId) conditions.push(eq(shootCalendarSync.userId, userId));
      const [sync] = await database
        .select()
        .from(shootCalendarSync)
        .where(and(...conditions))
        .limit(1);

      return sync ?? null;
    },

    async getSyncByExternalId(
      organizationId: string,
      externalEventId: string,
      provider = "google",
      userId?: string | null
    ): Promise<ShootCalendarSync | null> {
      const conditions = [
        eq(shootCalendarSync.organizationId, organizationId),
        eq(shootCalendarSync.provider, provider),
        eq(shootCalendarSync.externalEventId, externalEventId),
      ];
      if (userId) conditions.push(eq(shootCalendarSync.userId, userId));
      const [sync] = await database
        .select()
        .from(shootCalendarSync)
        .where(and(...conditions))
        .limit(1);

      return sync ?? null;
    },

    async saveShootSync(input: NewShootCalendarSync): Promise<ShootCalendarSync> {
      const existing = await this.getShootSync(
        input.organizationId,
        input.shootId,
        input.provider ?? "google",
        input.userId
      );

      if (existing) {
        const [updated] = await database
          .update(shootCalendarSync)
          .set({
            externalCalendarId: input.externalCalendarId ?? existing.externalCalendarId,
            externalEventId: input.externalEventId,
            externalEventEtag: input.externalEventEtag ?? existing.externalEventEtag,
            externalEventUpdatedAt: input.externalEventUpdatedAt ?? existing.externalEventUpdatedAt,
            externalICalUID: input.externalICalUID ?? existing.externalICalUID,
            lastSyncedAt: new Date(),
            lastSyncHash: input.lastSyncHash ?? existing.lastSyncHash,
            syncStatus: input.syncStatus ?? "synced",
            updatedAt: new Date(),
          })
          .where(eq(shootCalendarSync.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await database
        .insert(shootCalendarSync)
        .values({
          ...input,
          provider: input.provider ?? "google",
          externalCalendarId: input.externalCalendarId ?? "primary",
          lastSyncedAt: new Date(),
          syncStatus: input.syncStatus ?? "synced",
        })
        .returning();
      return created;
    },

    async updateShootSyncStatus(
      id: string,
      syncStatus: string
    ): Promise<ShootCalendarSync | null> {
      const [updated] = await database
        .update(shootCalendarSync)
        .set({ syncStatus, updatedAt: new Date() })
        .where(eq(shootCalendarSync.id, id))
        .returning();
      return updated ?? null;
    },

    async deleteShootSync(
      organizationId: string,
      shootId: string,
      provider = "google",
      userId?: string | null
    ): Promise<void> {
      const conditions = [
        eq(shootCalendarSync.organizationId, organizationId),
        eq(shootCalendarSync.shootId, shootId),
        eq(shootCalendarSync.provider, provider),
      ];
      if (userId) conditions.push(eq(shootCalendarSync.userId, userId));
      await database
        .delete(shootCalendarSync)
        .where(and(...conditions));
    },

    async listShootSyncs(
      organizationId: string,
      provider = "google",
      userId?: string | null
    ): Promise<ShootCalendarSync[]> {
      const conditions = [
        eq(shootCalendarSync.organizationId, organizationId),
        eq(shootCalendarSync.provider, provider),
      ];
      if (userId) conditions.push(eq(shootCalendarSync.userId, userId));
      return database
        .select()
        .from(shootCalendarSync)
        .where(and(...conditions));
    },

    async isExcludedEvent(
      organizationId: string,
      userId: string,
      externalEventId: string,
      calendarId = "primary"
    ): Promise<boolean> {
      const [row] = await database
        .select({ id: excludedGoogleCalendarEvents.id })
        .from(excludedGoogleCalendarEvents)
        .where(
          and(
            eq(excludedGoogleCalendarEvents.organizationId, organizationId),
            eq(excludedGoogleCalendarEvents.userId, userId),
            eq(excludedGoogleCalendarEvents.calendarId, calendarId),
            eq(excludedGoogleCalendarEvents.externalEventId, externalEventId)
          )
        )
        .limit(1);
      return Boolean(row);
    },

    async saveExcludedEvent(
      organizationId: string,
      userId: string,
      externalEventId: string,
      reason = "birthday",
      calendarId = "primary"
    ): Promise<void> {
      const exists = await this.isExcludedEvent(organizationId, userId, externalEventId, calendarId);
      if (exists) return;
      await database.insert(excludedGoogleCalendarEvents).values({
        organizationId,
        userId,
        calendarId,
        externalEventId,
        reason,
      });
    },
  };
}

export type GoogleCalendarRepository = ReturnType<typeof createGoogleCalendarRepository>;
