import { beforeEach, describe, expect, it, vi } from "vitest";

// Ensure the real DB config is never initialized in tests when DATABASE_URL is not provided
vi.mock("@/server/db", () => ({
  db: {} as unknown as import("@/server/db").Database,
}));

import type { Shoot, GoogleCalendarConnection, ShootCalendarSync } from "@/server/db/schema";
import {
  computeShootSyncHash,
  createGoogleCalendarSyncService,
  shootToCalendarEvent,
} from "./google-calendar-sync";
import type { CalendarChange, CalendarProvider, CalendarProviderEvent } from "@/server/integrations/calendar/types";
import { GoogleAuthRevokedError } from "@/server/integrations/calendar/types";

const orgId = "10000000-0000-0000-0000-000000000001";
const shootId = "30000000-0000-0000-0000-000000000001";

function makeMockShoot(overrides?: Partial<Shoot>): Shoot {
  return {
    id: shootId,
    organizationId: orgId,
    projectId: null,
    title: "Campaign Shoot Day 1",
    status: "confirmed",
    startsAt: new Date("2026-10-05T09:00:00Z"),
    endsAt: new Date("2026-10-05T13:00:00Z"),
    callTime: new Date("2026-10-05T08:00:00Z"),
    locationName: "G.Lab Studio",
    locationAddress: "123 Main St",
    notes: "Main camera unit",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

function makeMockConnection(overrides?: Partial<GoogleCalendarConnection>): GoogleCalendarConnection {
  return {
    id: "conn-1",
    organizationId: orgId,
    calendarId: "primary",
    calendarName: "Primary Calendar",
    accountEmail: "producer@glab.vn",
    accountName: "Producer Lead",
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 3600_000),
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/calendar.events",
    syncEnabled: true,
    syncFromGoogle: true,
    syncToGoogle: true,
    syncShoots: true,
    syncMeetings: true,
    syncLocationScout: true,
    syncInternalEvents: true,
    nextSyncToken: "cursor-100",
    lastSyncedAt: new Date("2026-10-01T00:00:00Z"),
    lastSyncStatus: "success",
    lastSyncMessage: "Synced",
    lastErrorAt: null,
    status: "connected",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("Google Calendar Sync Service (LIVE-02)", () => {
  let inMemoryShoots: Map<string, Shoot>;
  let inMemorySyncMappings: Map<string, ShootCalendarSync>;
  let inMemoryConnection: GoogleCalendarConnection | null;
  let mockProvider: CalendarProvider;
  let createEventSpy: ReturnType<typeof vi.fn>;
  let updateEventSpy: ReturnType<typeof vi.fn>;
  let deleteEventSpy: ReturnType<typeof vi.fn>;
  let pullChangesSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    inMemoryShoots = new Map();
    inMemorySyncMappings = new Map();
    inMemoryConnection = makeMockConnection();

    createEventSpy = vi.fn(async (_calId: string, _event: CalendarProviderEvent) => ({
      externalEventId: "google-evt-" + Math.random().toString(36).substring(2, 8),
      etag: '"etag-1"',
    }));

    updateEventSpy = vi.fn(async (_calId: string, eventId: string, _event: CalendarProviderEvent) => ({
      externalEventId: eventId,
      etag: '"etag-updated"',
    }));

    deleteEventSpy = vi.fn(async (_calId: string, _eventId: string) => {});

    pullChangesSpy = vi.fn(async (_calId: string, _syncToken?: string | null) => ({
      changes: [] as CalendarChange[],
      nextSyncToken: "next-cursor-200",
    }));

    mockProvider = {
      createEvent: createEventSpy,
      updateEvent: updateEventSpy,
      deleteEvent: deleteEventSpy,
      pullChanges: pullChangesSpy,
      getUserInfo: vi.fn(async () => ({ email: "producer@glab.vn", name: "Producer Lead" })),
      listCalendars: vi.fn(async () => [{ id: "primary", summary: "Primary", primary: true }]),
    };
  });

  function createTestService() {
    const mockCalendarRepo = {
      getConnection: vi.fn(async () => inMemoryConnection),
      saveConnection: vi.fn(async (_orgId, data) => {
        inMemoryConnection = { ...makeMockConnection(), ...data };
        return inMemoryConnection;
      }),
      updateTokens: vi.fn(async (_orgId, tokens) => {
        if (inMemoryConnection) {
          inMemoryConnection.accessToken = tokens.accessToken;
          inMemoryConnection.expiresAt = tokens.expiresAt;
        }
      }),
      updateSyncCursor: vi.fn(async (_orgId, nextSyncToken, status, message) => {
        if (inMemoryConnection) {
          inMemoryConnection.nextSyncToken = nextSyncToken;
          inMemoryConnection.lastSyncStatus = status;
          inMemoryConnection.lastSyncMessage = message ?? null;
          inMemoryConnection.lastSyncedAt = new Date();
        }
      }),
      updateConnectionStatus: vi.fn(async (_orgId, status, message) => {
        if (inMemoryConnection) {
          inMemoryConnection.status = status;
          inMemoryConnection.lastSyncStatus = status === "error" || status === "revoked" ? "error" : "idle";
          inMemoryConnection.lastSyncMessage = message ?? null;
        }
      }),
      disconnect: vi.fn(async () => {
        if (inMemoryConnection) {
          inMemoryConnection.status = "disconnected";
          inMemoryConnection.accessToken = null;
          inMemoryConnection.refreshToken = null;
        }
      }),
      updateSettings: vi.fn(async (_orgId, settings) => {
        if (inMemoryConnection) {
          Object.assign(inMemoryConnection, settings);
        }
        return inMemoryConnection;
      }),
      getShootSync: vi.fn(async (_orgId, shootId) => inMemorySyncMappings.get(shootId) ?? null),
      getSyncByExternalId: vi.fn(async (_orgId, externalEventId) => {
        let matched: ShootCalendarSync | null = null;
        inMemorySyncMappings.forEach((mapping) => {
          if (mapping.externalEventId === externalEventId) {
            matched = mapping;
          }
        });
        return matched;
      }),
      saveShootSync: vi.fn(async (data: Partial<ShootCalendarSync>) => {
        const existing = inMemorySyncMappings.get(data.shootId!);
        const saved: ShootCalendarSync = {
          id: existing?.id ?? "sync-map-" + Math.random().toString(36).substring(2, 6),
          organizationId: data.organizationId ?? orgId,
          shootId: data.shootId!,
          provider: data.provider ?? "google",
          externalCalendarId: data.externalCalendarId ?? "primary",
          externalEventId: data.externalEventId!,
          externalEventEtag: data.externalEventEtag ?? null,
          externalICalUID: data.externalICalUID ?? null,
          lastSyncedAt: new Date(),
          lastSyncHash: data.lastSyncHash ?? null,
          syncStatus: data.syncStatus ?? "synced",
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        inMemorySyncMappings.set(data.shootId!, saved);
        return saved;
      }),
      updateShootSyncStatus: vi.fn(),
      deleteShootSync: vi.fn(async (_orgId, shootId) => {
        inMemorySyncMappings.delete(shootId);
      }),
      listShootSyncs: vi.fn(async () => Array.from(inMemorySyncMappings.values())),
    };

    const mockShootRepo = {
      list: vi.fn(async () => Array.from(inMemoryShoots.values())),
      findById: vi.fn(async (_orgId, id) => inMemoryShoots.get(id) ?? null),
      create: vi.fn(async (input: {
        organizationId: string;
        title: string;
        status?: string;
        startsAt: Date;
        endsAt: Date;
        locationName?: string | null;
        notes?: string | null;
      }) => {
        const created: Shoot = {
          id: "shoot-" + Math.random().toString(36).substring(2, 8),
          organizationId: input.organizationId,
          projectId: null,
          title: input.title,
          status: input.status ?? "planned",
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          callTime: null,
          locationName: input.locationName ?? null,
          locationAddress: null,
          notes: input.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryShoots.set(created.id, created);
        return created;
      }),
      update: vi.fn(async (_orgId, id, input) => {
        const shoot = inMemoryShoots.get(id);
        if (!shoot) return null;
        const updated = { ...shoot, ...input, updatedAt: new Date() };
        inMemoryShoots.set(id, updated);
        return updated;
      }),
    };

    return {
      service: createGoogleCalendarSyncService({
        repository: mockCalendarRepo as unknown as ReturnType<typeof import("@/server/db/google-calendar").createGoogleCalendarRepository>,
        shootRepository: mockShootRepo as unknown as ReturnType<typeof import("@/server/db/shoots").createShootRepository>,
        createProvider: () => mockProvider,
      }),
      calendarRepo: mockCalendarRepo,
      shootRepo: mockShootRepo,
    };
  }

  describe("Pure utility functions", () => {
    it("computeShootSyncHash produces identical hash for identical shoot data", () => {
      const shootA = makeMockShoot();
      const shootB = makeMockShoot();
      expect(computeShootSyncHash(shootA)).toBe(computeShootSyncHash(shootB));
    });

    it("computeShootSyncHash produces different hash when schedule or status changes", () => {
      const shootA = makeMockShoot({ title: "Day 1" });
      const shootB = makeMockShoot({ title: "Day 2" });
      const shootC = makeMockShoot({ status: "cancelled" });

      expect(computeShootSyncHash(shootA)).not.toBe(computeShootSyncHash(shootB));
      expect(computeShootSyncHash(shootA)).not.toBe(computeShootSyncHash(shootC));
    });

    it("shootToCalendarEvent maps fields, formats dates, and attaches private metadata", () => {
      const shoot = makeMockShoot();
      const event = shootToCalendarEvent(shoot, "Asia/Ho_Chi_Minh");

      expect(event.summary).toBe(shoot.title);
      expect(event.start.dateTime).toBe(shoot.startsAt.toISOString());
      expect(event.end.dateTime).toBe(shoot.endsAt.toISOString());
      expect(event.location).toContain("G.Lab Studio");
      expect(event.extendedProperties?.private?.glabShootId).toBe(shoot.id);
    });
  });

  describe("Push shoots to Google Calendar (Idempotency & Lifecycle)", () => {
    it("creates a new event on Google Calendar when shoot is first synced", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      const result = await service.syncShootToGoogle(orgId, shoot.id);

      expect(result.ok).toBe(true);
      expect(result.action).toBe("created");
      expect(createEventSpy).toHaveBeenCalledTimes(1);

      // Verify mapping was saved
      const mapping = inMemorySyncMappings.get(shoot.id);
      expect(mapping).toBeDefined();
      expect(mapping?.syncStatus).toBe("synced");
      expect(mapping?.lastSyncHash).toBe(computeShootSyncHash(shoot));
    });

    it("is completely idempotent: repeated sync produces NO duplicate events or API calls", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      // First sync: creates event
      const res1 = await service.syncShootToGoogle(orgId, shoot.id);
      expect(res1.action).toBe("created");
      expect(createEventSpy).toHaveBeenCalledTimes(1);

      // Second sync: identical data, must be skipped
      const res2 = await service.syncShootToGoogle(orgId, shoot.id);
      expect(res2.action).toBe("skipped_identical");
      expect(createEventSpy).toHaveBeenCalledTimes(1);
      expect(updateEventSpy).toHaveBeenCalledTimes(0);

      // Third sync: still skipped
      const res3 = await service.syncShootToGoogle(orgId, shoot.id);
      expect(res3.action).toBe("skipped_identical");
      expect(createEventSpy).toHaveBeenCalledTimes(1);
    });

    it("updates existing Google event when shoot schedule changes", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      await service.syncShootToGoogle(orgId, shoot.id);
      expect(createEventSpy).toHaveBeenCalledTimes(1);

      // Modify shoot schedule
      const modifiedShoot = {
        ...shoot,
        title: "Updated Brand Film Shoot",
        endsAt: new Date("2026-10-05T15:00:00Z"),
        updatedAt: new Date(),
      };
      inMemoryShoots.set(shoot.id, modifiedShoot);

      const updateResult = await service.syncShootToGoogle(orgId, shoot.id);

      expect(updateResult.ok).toBe(true);
      expect(updateResult.action).toBe("updated");
      expect(updateEventSpy).toHaveBeenCalledTimes(1);
      expect(createEventSpy).toHaveBeenCalledTimes(1); // Not called again
    });

    it("cancels/deletes Google Calendar event deterministically when shoot status is cancelled", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      await service.syncShootToGoogle(orgId, shoot.id);
      const mapping = inMemorySyncMappings.get(shoot.id);
      expect(mapping).toBeDefined();

      // Mark shoot as cancelled
      const cancelledShoot = { ...shoot, status: "cancelled", updatedAt: new Date() };
      inMemoryShoots.set(shoot.id, cancelledShoot);

      const cancelResult = await service.syncShootToGoogle(orgId, shoot.id);

      expect(cancelResult.ok).toBe(true);
      expect(cancelResult.action).toBe("cancelled");
      expect(deleteEventSpy).toHaveBeenCalledWith("primary", mapping?.externalEventId);
      expect(inMemorySyncMappings.get(shoot.id)?.syncStatus).toBe("cancelled");

      // Repeated cancel call is idempotent
      const repeatCancel = await service.syncShootToGoogle(orgId, shoot.id);
      expect(repeatCancel.action).toBe("skipped_identical");
      expect(deleteEventSpy).toHaveBeenCalledTimes(1);
    });

    it("gracefully skips sync when syncToGoogle is disabled", async () => {
      const { service } = createTestService();
      if (inMemoryConnection) inMemoryConnection.syncToGoogle = false;

      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      const result = await service.syncShootToGoogle(orgId, shoot.id);
      expect(result.action).toBe("skipped_disabled");
      expect(createEventSpy).not.toHaveBeenCalled();
    });
  });

  describe("Pull changes from Google Calendar (Reconciliation & Source of Truth)", () => {
    it("imports new Google Calendar events as planned shoots in G.Lab without duplicates", async () => {
      const { service } = createTestService();

      pullChangesSpy.mockResolvedValueOnce({
        changes: [
          {
            eventType: "created",
            externalEventId: "g-event-new-001",
            etag: '"etag-100"',
            event: {
              summary: "Lookbook Shoot from Google",
              location: "Studio B",
              start: { dateTime: "2026-10-10T09:00:00Z" },
              end: { dateTime: "2026-10-10T12:00:00Z" },
              description: "Imported shoot",
            },
          },
        ],
        nextSyncToken: "cursor-token-new",
      });

      const result = await service.pullChangesFromGoogle(orgId);

      expect(result.ok).toBe(true);
      expect(result.pulledCount).toBe(1);
      expect(inMemoryShoots.size).toBe(1);

      const createdShoot = Array.from(inMemoryShoots.values())[0];
      expect(createdShoot.title).toBe("Lookbook Shoot from Google");
      expect(createdShoot.status).toBe("planned");

      // Pulling again with same event produces no duplicates
      pullChangesSpy.mockResolvedValueOnce({
        changes: [
          {
            eventType: "updated",
            externalEventId: "g-event-new-001",
            etag: '"etag-100"',
            event: {
              summary: "Lookbook Shoot from Google",
              location: "Studio B",
              start: { dateTime: "2026-10-10T09:00:00Z" },
              end: { dateTime: "2026-10-10T12:00:00Z" },
            },
          },
        ],
        nextSyncToken: "cursor-token-new",
      });

      const repeatResult = await service.pullChangesFromGoogle(orgId);
      expect(repeatResult.pulledCount).toBe(0);
      expect(inMemoryShoots.size).toBe(1); // Still 1 shoot, no duplicates!
    });

    it("cancels G.Lab shoot when Google event is deleted externally (Rule 3)", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot({ status: "confirmed" });
      inMemoryShoots.set(shoot.id, shoot);

      // Initial push creates mapping
      await service.syncShootToGoogle(orgId, shoot.id);
      const mapping = inMemorySyncMappings.get(shoot.id);
      expect(mapping).toBeDefined();

      // Remote deletion event arrives
      pullChangesSpy.mockResolvedValueOnce({
        changes: [
          {
            eventType: "deleted",
            externalEventId: mapping!.externalEventId,
          },
        ],
        nextSyncToken: "cursor-deleted",
      });

      const pullResult = await service.pullChangesFromGoogle(orgId);
      expect(pullResult.ok).toBe(true);
      expect(pullResult.pulledCount).toBe(1);

      // Verify shoot is marked cancelled (preserving production history)
      const reconciledShoot = inMemoryShoots.get(shoot.id);
      expect(reconciledShoot?.status).toBe("cancelled");
      expect(inMemorySyncMappings.get(shoot.id)?.syncStatus).toBe("cancelled");
    });

    it("applies last-write-wins reconciliation for schedule modifications (Rule 2)", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot({
        updatedAt: new Date("2026-10-01T10:00:00Z"),
      });
      inMemoryShoots.set(shoot.id, shoot);
      await service.syncShootToGoogle(orgId, shoot.id);
      const mapping = inMemorySyncMappings.get(shoot.id);

      // Google event updated at a later timestamp
      pullChangesSpy.mockResolvedValueOnce({
        changes: [
          {
            eventType: "updated",
            externalEventId: mapping!.externalEventId,
            updatedAt: new Date("2026-10-01T12:00:00Z"), // Newer!
            event: {
              summary: "Updated Title from Google Calendar",
              start: { dateTime: "2026-10-05T10:00:00Z" },
              end: { dateTime: "2026-10-05T14:00:00Z" },
            },
          },
        ],
        nextSyncToken: "cursor-timing",
      });

      await service.pullChangesFromGoogle(orgId);

      const updated = inMemoryShoots.get(shoot.id);
      expect(updated?.title).toBe("Updated Title from Google Calendar");
      expect(updated?.startsAt).toEqual(new Date("2026-10-05T10:00:00Z"));
    });
  });

  describe("Provider failure handling & production safety", () => {
    it("handles GoogleAuthRevokedError safely without throwing and updates connection status", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      createEventSpy.mockRejectedValueOnce(
        new GoogleAuthRevokedError("Invalid grant: Token revoked by user.")
      );

      const result = await service.syncShootToGoogle(orgId, shoot.id);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("AUTH_REVOKED");
      expect(inMemoryConnection?.status).toBe("revoked");
      expect(inMemoryConnection?.lastSyncStatus).toBe("error");
    });

    it("handles general provider API errors without crashing the application", async () => {
      const { service } = createTestService();
      const shoot = makeMockShoot();
      inMemoryShoots.set(shoot.id, shoot);

      createEventSpy.mockRejectedValueOnce(new Error("Rate limit exceeded 503"));

      const result = await service.syncShootToGoogle(orgId, shoot.id);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("PROVIDER_ERROR");
      expect(inMemoryConnection?.lastSyncStatus).toBe("error");
    });

    it("disconnect cleans up credentials and marks status as disconnected", async () => {
      const { service } = createTestService();
      expect(inMemoryConnection?.status).toBe("connected");

      await service.disconnect(orgId);

      expect(inMemoryConnection?.status).toBe("disconnected");
      expect(inMemoryConnection?.accessToken).toBeNull();
    });
  });

  describe("syncAll orchestration", () => {
    it("runs bidirectional synchronization and updates sync cursor", async () => {
      const { service } = createTestService();
      const shoot1 = makeMockShoot({ id: "s-1", title: "Shoot 1" });
      const shoot2 = makeMockShoot({ id: "s-2", title: "Shoot 2" });
      inMemoryShoots.set(shoot1.id, shoot1);
      inMemoryShoots.set(shoot2.id, shoot2);

      const result = await service.syncAll(orgId);

      expect(result.ok).toBe(true);
      expect(result.pushedCount).toBe(2);
      expect(createEventSpy).toHaveBeenCalledTimes(2);

      // Running syncAll a second time immediately is idempotent: pushes 0
      const repeatResult = await service.syncAll(orgId);
      expect(repeatResult.ok).toBe(true);
      expect(repeatResult.pushedCount).toBe(0);
      expect(createEventSpy).toHaveBeenCalledTimes(2); // Still 2, no extra creates
    });
  });
});
