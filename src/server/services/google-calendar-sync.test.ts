import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));

import {
  computeShootSyncHash,
  createGoogleCalendarSyncService,
  resolveSourceCalendarIds,
  resolveTargetCalendarId,
  shootToCalendarEvent,
} from "./google-calendar-sync";
import type { CalendarChange, CalendarProvider, CalendarProviderEvent } from "@/server/integrations/calendar/types";

const orgId = "10000000-0000-0000-0000-000000000001";
const userA = "20000000-0000-0000-0000-000000000001";
const userB = "20000000-0000-0000-0000-000000000002";
const shootId = "30000000-0000-0000-0000-000000000001";

function makeShoot(overrides: Record<string, unknown> = {}) {
  return {
    id: shootId,
    organizationId: orgId,
    createdBy: userA,
    projectId: null,
    title: "Campaign Shoot",
    status: "confirmed",
    startsAt: new Date("2026-10-05T09:00:00Z"),
    endsAt: new Date("2026-10-05T13:00:00Z"),
    callTime: null,
    locationName: "G.Lab Studio",
    locationAddress: "Hoi An",
    notes: "Main unit",
    syncPolicy: "google",
    isTestData: false,
    sourceCalendarId: null,
    externalEventId: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  } as any;
}

function makeConnection(userId = userA, overrides: Record<string, unknown> = {}) {
  return {
    id: `conn-${userId}`,
    organizationId: orgId,
    userId,
    calendarId: "primary",
    calendarName: "Primary",
    targetCalendarId: "primary",
    sourceCalendarIds: JSON.stringify(["primary"]),
    accountEmail: `${userId}@example.com`,
    accountName: "User",
    accessToken: "token",
    refreshToken: "refresh",
    expiresAt: new Date(Date.now() + 3600_000),
    tokenType: "Bearer",
    scope: "calendar.events",
    syncEnabled: true,
    syncShoots: true,
    syncMeetings: true,
    syncLocationScout: true,
    syncInternalEvents: true,
    syncFromGoogle: true,
    syncToGoogle: true,
    nextSyncToken: "cursor-1",
    lastSyncedAt: null,
    lastSyncStatus: "idle",
    lastSyncMessage: null,
    lastErrorAt: null,
    status: "connected",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

describe("Primary Calendar Sync", () => {
  let shoots: Map<string, any>;
  let connections: Map<string, any>;
  let mappings: Map<string, any>;
  let excluded: Set<string>;
  let createEvent: ReturnType<typeof vi.fn>;
  let updateEvent: ReturnType<typeof vi.fn>;
  let deleteEvent: ReturnType<typeof vi.fn>;
  let pullChanges: ReturnType<typeof vi.fn>;
  let provider: CalendarProvider;

  const mappingKey = (userId: string, id: string) => `${userId}:${id}`;
  const excludedKey = (userId: string, eventId: string) => `${userId}:${eventId}`;

  beforeEach(() => {
    shoots = new Map();
    connections = new Map([
      [userA, makeConnection(userA)],
      [userB, makeConnection(userB, { nextSyncToken: "cursor-b" })],
    ]);
    mappings = new Map();
    excluded = new Set();

    createEvent = vi.fn(async (_calendarId: string, _event: CalendarProviderEvent) => ({
      externalEventId: "google-created-1",
      etag: '"etag-create"',
      updatedAt: new Date("2026-10-05T14:00:00Z"),
    }));
    updateEvent = vi.fn(async (_calendarId: string, externalEventId: string) => ({
      externalEventId,
      etag: '"etag-update"',
      updatedAt: new Date("2026-10-05T15:00:00Z"),
    }));
    deleteEvent = vi.fn(async () => undefined);
    pullChanges = vi.fn(async (_calendarId: string, _token?: string | null) => ({
      changes: [] as CalendarChange[],
      nextSyncToken: "cursor-next",
    }));

    provider = {
      createEvent,
      updateEvent,
      deleteEvent,
      pullChanges,
      getUserInfo: vi.fn(async () => ({ email: "user@example.com", name: "User" })),
      listCalendars: vi.fn(async () => [{ id: "primary", summary: "Primary", primary: true }]),
    };
  });

  function makeService() {
    const calendarRepo = {
      getUserConnection: vi.fn(async (_orgId: string, userId: string) => connections.get(userId) ?? null),
      getConnection: vi.fn(async (_orgId: string, _calendarId = "primary", userId?: string) => userId ? connections.get(userId) ?? null : null),
      saveConnection: vi.fn(),
      updateTokens: vi.fn(),
      updateConnectionStatus: vi.fn(async (_orgId: string, status: string, message?: string, _cal = "primary", userId?: string) => {
        const conn = userId ? connections.get(userId) : null;
        if (conn) Object.assign(conn, { status, lastSyncMessage: message ?? null });
      }),
      updateSettings: vi.fn(async (_orgId: string, settings: Record<string, unknown>, _cal = "primary", userId?: string) => {
        const conn = userId ? connections.get(userId) : null;
        if (conn) Object.assign(conn, settings);
        return conn ?? null;
      }),
      disconnect: vi.fn(),
      updateSyncCursor: vi.fn(async (_orgId: string, token: string | null, status: string, message?: string, _cal = "primary", userId?: string) => {
        const conn = userId ? connections.get(userId) : null;
        if (conn) Object.assign(conn, { nextSyncToken: token, lastSyncStatus: status, lastSyncMessage: message ?? null });
      }),
      getShootSync: vi.fn(async (_orgId: string, id: string, _provider = "google", userId?: string) => mappings.get(mappingKey(userId ?? "", id)) ?? null),
      getSyncByExternalId: vi.fn(async (_orgId: string, eventId: string, _provider = "google", userId?: string) => {
        for (const mapping of Array.from(mappings.values())) {
          if (mapping.userId === userId && mapping.externalEventId === eventId) return mapping;
        }
        return null;
      }),
      saveShootSync: vi.fn(async (input: any) => {
        const key = mappingKey(input.userId, input.shootId);
        const existing = mappings.get(key);
        const saved = {
          id: existing?.id ?? `map-${mappings.size + 1}`,
          organizationId: input.organizationId,
          userId: input.userId,
          shootId: input.shootId,
          provider: input.provider ?? "google",
          externalCalendarId: input.externalCalendarId ?? "primary",
          externalEventId: input.externalEventId,
          externalEventEtag: input.externalEventEtag ?? existing?.externalEventEtag ?? null,
          externalEventUpdatedAt: input.externalEventUpdatedAt ?? existing?.externalEventUpdatedAt ?? null,
          externalICalUID: input.externalICalUID ?? null,
          lastSyncedAt: new Date(),
          lastSyncHash: input.lastSyncHash ?? existing?.lastSyncHash ?? null,
          syncStatus: input.syncStatus ?? "synced",
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        mappings.set(key, saved);
        return saved;
      }),
      updateShootSyncStatus: vi.fn(),
      deleteShootSync: vi.fn(),
      listShootSyncs: vi.fn(async () => Array.from(mappings.values())),
      isExcludedEvent: vi.fn(async (_orgId: string, userId: string, eventId: string) => excluded.has(excludedKey(userId, eventId))),
      saveExcludedEvent: vi.fn(async (_orgId: string, userId: string, eventId: string) => {
        excluded.add(excludedKey(userId, eventId));
      }),
    };

    const shootRepo = {
      list: vi.fn(async () => Array.from(shoots.values())),
      findById: vi.fn(async (_orgId: string, id: string) => shoots.get(id) ?? null),
      create: vi.fn(async (input: any) => {
        const created = makeShoot({
          ...input,
          id: `imported-${shoots.size + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        shoots.set(created.id, created);
        return created;
      }),
      update: vi.fn(async (_orgId: string, id: string, input: any) => {
        const current = shoots.get(id);
        if (!current) return null;
        const updated = { ...current, ...input, updatedAt: new Date() };
        shoots.set(id, updated);
        return updated;
      }),
    };

    const service = createGoogleCalendarSyncService({
      repository: calendarRepo as any,
      shootRepository: shootRepo as any,
      createProvider: () => provider,
    });
    return { service, calendarRepo, shootRepo };
  }

  it("always resolves primary as import and export calendar", () => {
    const conn = makeConnection(userA, { targetCalendarId: "legacy-production", sourceCalendarIds: '["legacy"]' });
    expect(resolveTargetCalendarId(conn)).toBe("primary");
    expect(resolveSourceCalendarIds(conn)).toEqual(["primary"]);
  });

  it("exports to primary with exact G.Lab private metadata and persists mapping metadata", async () => {
    const { service } = makeService();
    const shoot = makeShoot();
    shoots.set(shoot.id, shoot);

    const result = await service.syncShootToGoogle(orgId, userA, shoot.id);

    expect(result.action).toBe("created");
    expect(createEvent).toHaveBeenCalledWith("primary", expect.objectContaining({
      extendedProperties: { private: { glabManaged: "true", glabShootId: shoot.id, glabUserId: userA } },
    }));
    const mapping = mappings.get(mappingKey(userA, shoot.id));
    expect(mapping.externalEventId).toBe("google-created-1");
    expect(mapping.externalEventEtag).toBe('"etag-create"');
    expect(mapping.externalEventUpdatedAt).toEqual(new Date("2026-10-05T14:00:00Z"));
  });

  it("does not create a duplicate when a mapping already exists", async () => {
    const { service } = makeService();
    const shoot = makeShoot();
    shoots.set(shoot.id, shoot);
    mappings.set(mappingKey(userA, shoot.id), {
      id: "map-existing", organizationId: orgId, userId: userA, shootId: shoot.id,
      provider: "google", externalCalendarId: "primary", externalEventId: "existing-google-event",
      externalEventEtag: null, externalEventUpdatedAt: null, externalICalUID: null,
      lastSyncedAt: new Date(), lastSyncHash: "stale", syncStatus: "synced", createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await service.syncShootToGoogle(orgId, userA, shoot.id);
    expect(result.action).toBe("updated");
    expect(updateEvent).toHaveBeenCalledWith("primary", "existing-google-event", expect.anything());
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("keeps mappings and sync tokens isolated per user in the same workspace", async () => {
    const { service } = makeService();
    const shoot = makeShoot();
    shoots.set(shoot.id, shoot);

    await service.syncShootToGoogle(orgId, userA, shoot.id);
    expect(mappings.has(mappingKey(userA, shoot.id))).toBe(true);
    expect(mappings.has(mappingKey(userB, shoot.id))).toBe(false);

    await service.pullChangesFromGoogle(orgId, userB);
    expect(pullChanges).toHaveBeenLastCalledWith("primary", "cursor-b");
    expect(connections.get(userB).nextSyncToken).toBe("cursor-next");
    expect(connections.get(userA).nextSyncToken).toBe("cursor-1");
  });

  it("persists provider birthday IDs as excluded and skips them on later pulls", async () => {
    const { service, calendarRepo } = makeService();
    pullChanges.mockResolvedValueOnce({
      changes: [{
        eventType: "updated", externalEventId: "birthday-1",
        event: { summary: "Birthday", providerEventType: "birthday", start: { dateTime: "2026-10-10T00:00:00Z" }, end: { dateTime: "2026-10-11T00:00:00Z" } },
      }],
      nextSyncToken: "birthday-cursor",
    });

    const first = await service.pullChangesFromGoogle(orgId, userA);
    expect(first.pulledCount).toBe(0);
    expect(calendarRepo.saveExcludedEvent).toHaveBeenCalledWith(orgId, userA, "birthday-1", "birthday", "primary");
    expect(excluded.has(excludedKey(userA, "birthday-1"))).toBe(true);

    pullChanges.mockResolvedValueOnce({
      changes: [{
        eventType: "updated", externalEventId: "birthday-1",
        event: { summary: "Changed", start: { dateTime: "2026-10-10T00:00:00Z" }, end: { dateTime: "2026-10-11T00:00:00Z" } },
      }],
      nextSyncToken: "birthday-cursor-2",
    });
    await service.pullChangesFromGoogle(orgId, userA);
    expect(shoots.size).toBe(0);
  });

  it("imports a normal user event even when its title contains 'Sinh nhật'", async () => {
    const { service } = makeService();
    pullChanges.mockResolvedValueOnce({
      changes: [{
        eventType: "updated", externalEventId: "normal-1", updatedAt: new Date("2026-10-10T01:00:00Z"),
        event: { summary: "Sinh nhật thương hiệu G.Lab", providerEventType: "default", start: { dateTime: "2026-10-10T09:00:00Z" }, end: { dateTime: "2026-10-10T10:00:00Z" } },
      }],
      nextSyncToken: "normal-cursor",
    });

    const result = await service.pullChangesFromGoogle(orgId, userA);
    expect(result.pulledCount).toBe(1);
    expect(Array.from(shoots.values())[0].title).toBe("Sinh nhật thương hiệu G.Lab");
  });

  it("prevents G.Lab-managed loop imports and links same-user glabShootId", async () => {
    const { service } = makeService();
    const shoot = makeShoot();
    shoots.set(shoot.id, shoot);
    pullChanges.mockResolvedValueOnce({
      changes: [{
        eventType: "updated", externalEventId: "managed-1",
        event: {
          summary: "Managed", start: { dateTime: "2026-10-10T09:00:00Z" }, end: { dateTime: "2026-10-10T10:00:00Z" },
          extendedProperties: { private: { glabManaged: "true", glabShootId: shoot.id, glabUserId: userA } },
        },
      }],
      nextSyncToken: "managed-cursor",
    });

    const result = await service.pullChangesFromGoogle(orgId, userA);
    expect(result.pulledCount).toBe(0);
    expect(shoots.size).toBe(1);
    expect(mappings.get(mappingKey(userA, shoot.id)).externalEventId).toBe("managed-1");

    pullChanges.mockResolvedValueOnce({
      changes: [{
        eventType: "updated", externalEventId: "managed-other-user",
        event: {
          summary: "Other managed", start: { dateTime: "2026-10-10T11:00:00Z" }, end: { dateTime: "2026-10-10T12:00:00Z" },
          extendedProperties: { private: { glabManaged: "true", glabShootId: "other", glabUserId: userB } },
        },
      }],
      nextSyncToken: "managed-cursor-2",
    });
    await service.pullChangesFromGoogle(orgId, userA);
    expect(shoots.size).toBe(1);
  });

  it("handles remote deletion without deleting local history and skips disabled/test exports", async () => {
    const { service } = makeService();
    const shoot = makeShoot();
    shoots.set(shoot.id, shoot);
    await service.syncShootToGoogle(orgId, userA, shoot.id);

    pullChanges.mockResolvedValueOnce({
      changes: [{ eventType: "deleted", externalEventId: "google-created-1" }],
      nextSyncToken: "deleted-cursor",
    });
    const pulled = await service.pullChangesFromGoogle(orgId, userA);
    expect(pulled.pulledCount).toBe(1);
    expect(shoots.get(shoot.id).status).toBe("cancelled");

    for (const disabled of [
      makeShoot({ id: "local", syncPolicy: "local_only" }),
      makeShoot({ id: "excluded", syncPolicy: "excluded" }),
      makeShoot({ id: "test", isTestData: true }),
    ]) {
      shoots.set(disabled.id, disabled);
      const result = await service.syncShootToGoogle(orgId, userA, disabled.id);
      expect(result.action).toBe("skipped_disabled");
    }
  });

  it("shootToCalendarEvent and sync hash remain deterministic", () => {
    const shoot = makeShoot();
    expect(computeShootSyncHash(shoot)).toBe(computeShootSyncHash({ ...shoot }));
    const event = shootToCalendarEvent(shoot, userA);
    expect(event.extendedProperties?.private).toEqual({ glabManaged: "true", glabShootId: shoot.id, glabUserId: userA });
  });
});
