"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { shootCalendarSync, shoots } from "@/server/db/schema";
import { requireWorkspaceContext } from "@/server/workspace-context";
import { createGoogleCalendarSyncService } from "@/server/services/google-calendar-sync";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";
import { isSafeGoogleBirthdayCleanupCandidate } from "@/server/integrations/calendar/google-calendar-sources";

async function getContext() {
  const { user, organization } = await requireWorkspaceContext();
  const syncService = createGoogleCalendarSyncService({ db });
  const calendarRepo = createGoogleCalendarRepository(db);

  return { user, organization, syncService, calendarRepo };
}

export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/**
 * Triggers an immediate manual sync between G.Lab and Google Calendar.
 */
export async function triggerGoogleCalendarSyncAction(): Promise<ActionState> {
  try {
    const { user, organization, syncService } = await getContext();
    const result = await syncService.syncAll(organization.id, user.id);

    revalidatePath("/integrations/google-calendar");
    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");

    try {
      const { revalidateTag } = await import("next/cache");
      const { CACHE_TAGS } = await import("@/server/cache-keys");
      revalidateTag(CACHE_TAGS.calendar(organization.id));
      revalidateTag(CACHE_TAGS.dashboard(organization.id));
    } catch (e) {
      console.warn("revalidateTag warning:", e);
    }

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        message: result.message || "Đồng bộ thất bại.",
      };
    }

    return {
      ok: true,
      message: `Đồng bộ thành công: ${result.pushedCount} đã xuất, ${result.pulledCount} đã nhập.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: "UNEXPECTED_ERROR",
      message: err instanceof Error ? err.message : "Lỗi không xác định khi đồng bộ.",
    };
  }
}

/**
 * Disconnects the Google Calendar integration safely.
 */
export async function disconnectGoogleCalendarAction(): Promise<ActionState> {
  try {
    const { user, organization, calendarRepo } = await getContext();
    await calendarRepo.disconnect(organization.id, "primary", user.id);

    revalidatePath("/integrations/google-calendar");
    revalidatePath("/settings");

    return {
      ok: true,
      message: "Đã ngắt kết nối Google Calendar thành công.",
    };
  } catch (err) {
    return {
      ok: false,
      error: "DISCONNECT_FAILED",
      message: err instanceof Error ? err.message : "Không thể ngắt kết nối lúc này.",
    };
  }
}

/**
 * Updates synchronization options (toggles, checkboxes, target & source calendars).
 */
export async function updateGoogleCalendarSettingsAction(
  settings: {
    syncEnabled?: boolean;
  }
): Promise<ActionState> {
  try {
    const { user, organization, calendarRepo } = await getContext();
    const syncEnabled = settings.syncEnabled ?? true;
    const serializedSettings = {
      syncEnabled,
      syncFromGoogle: syncEnabled,
      syncToGoogle: syncEnabled,
      targetCalendarId: "primary",
      sourceCalendarIds: JSON.stringify(["primary"]),
    };
    await calendarRepo.updateSettings(organization.id, serializedSettings, "primary", user.id);

    revalidatePath("/integrations/google-calendar");
    return {
      ok: true,
      message: "Đã cập nhật cài đặt đồng bộ.",
    };
  } catch (err) {
    return {
      ok: false,
      error: "UPDATE_SETTINGS_FAILED",
      message: err instanceof Error ? err.message : "Không thể cập nhật cài đặt.",
    };
  }
}

export type BirthdayCleanupPreviewItem = {
  id: string;
  title: string;
  startsAt: string;
  sourceCalendarId: string | null;
  syncPolicy: string;
  isTestData: boolean;
  externalEventId: string | null;
};

export type BirthdayCleanupPreviewState = {
  ok: boolean;
  totalCount: number;
  unclassifiedCount: number;
  candidates: BirthdayCleanupPreviewItem[];
  error?: string;
};

/**
 * Admin action: Dry-run preview of all Google-imported birthday and test events in the local database.
 * Does not make any database changes and NEVER makes external Google Calendar API mutations.
 */
export async function previewBirthdayCleanupAction(): Promise<BirthdayCleanupPreviewState> {
  try {
    const { user, organization } = await getContext();

    const rows = await db
      .select({
        id: shoots.id,
        title: shoots.title,
        startsAt: shoots.startsAt,
        projectId: shoots.projectId,
        sourceCalendarId: shoots.sourceCalendarId,
        syncPolicy: shoots.syncPolicy,
        isTestData: shoots.isTestData,
        externalEventId: shoots.externalEventId,
        mappingProvider: shootCalendarSync.provider,
        mappingCalendarId: shootCalendarSync.externalCalendarId,
        mappingEventId: shootCalendarSync.externalEventId,
      })
      .from(shoots)
      .innerJoin(
        shootCalendarSync,
        and(
          eq(shootCalendarSync.organizationId, shoots.organizationId),
          eq(shootCalendarSync.shootId, shoots.id),
          eq(shootCalendarSync.userId, user.id),
          eq(shootCalendarSync.provider, "google")
        )
      )
      .where(eq(shoots.organizationId, organization.id))
      .orderBy(desc(shoots.startsAt));

    const safeRows = rows.filter((row) => isSafeGoogleBirthdayCleanupCandidate(row));
    const candidates: BirthdayCleanupPreviewItem[] = safeRows.map((r) => ({
      id: r.id,
      title: r.title,
      startsAt: r.startsAt.toISOString(),
      sourceCalendarId: r.sourceCalendarId,
      syncPolicy: r.syncPolicy,
      isTestData: Boolean(r.isTestData),
      externalEventId: r.externalEventId,
    }));

    const unclassifiedCount = candidates.filter(
      (c) => c.syncPolicy !== "excluded" || !c.isTestData
    ).length;

    return { ok: true, totalCount: candidates.length, unclassifiedCount, candidates };
  } catch (err) {
    return {
      ok: false,
      totalCount: 0,
      unclassifiedCount: 0,
      candidates: [],
      error: err instanceof Error ? err.message : "Không thể xem trước danh sách dọn dẹp.",
    };
  }
}

/**
 * Admin action: Confirms and classifies candidate birthday/test events.
 * Sets syncPolicy="excluded" and isTestData=true in the LOCAL database only.
 * NEVER deletes database records and NEVER deletes events/contacts on Google Calendar.
 */
export async function executeBirthdayCleanupAction(): Promise<ActionState & { count?: number }> {
  try {
    const { user, organization } = await getContext();

    const rows = await db
      .select({
        id: shoots.id,
        projectId: shoots.projectId,
        sourceCalendarId: shoots.sourceCalendarId,
        syncPolicy: shoots.syncPolicy,
        externalEventId: shoots.externalEventId,
        mappingProvider: shootCalendarSync.provider,
        mappingCalendarId: shootCalendarSync.externalCalendarId,
        mappingEventId: shootCalendarSync.externalEventId,
      })
      .from(shoots)
      .innerJoin(
        shootCalendarSync,
        and(
          eq(shootCalendarSync.organizationId, shoots.organizationId),
          eq(shootCalendarSync.shootId, shoots.id),
          eq(shootCalendarSync.userId, user.id),
          eq(shootCalendarSync.provider, "google")
        )
      )
      .where(eq(shoots.organizationId, organization.id));

    const candidates = rows.filter((row) => isSafeGoogleBirthdayCleanupCandidate(row));
    const ids = candidates.map((c) => c.id);
    if (ids.length === 0) {
      return { ok: true, count: 0, message: "Không có bản ghi sinh nhật Google an toàn nào cần loại trừ." };
    }

    await db
      .update(shoots)
      .set({ syncPolicy: "excluded", isTestData: true, updatedAt: new Date() })
      .where(inArray(shoots.id, ids));

    revalidatePath("/integrations/google-calendar");
    revalidatePath("/calendar");
    revalidatePath("/shoots");
    revalidatePath("/");

    return {
      ok: true,
      count: ids.length,
      message: `Đã đánh dấu ${ids.length} bản ghi sinh nhật Google là excluded/test trong G.Lab. Không có lệnh xóa nào được gửi tới Google.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: "CLEANUP_EXECUTE_FAILED",
      message: err instanceof Error ? err.message : "Lỗi khi phân loại bản ghi sinh nhật.",
    };
  }
}
