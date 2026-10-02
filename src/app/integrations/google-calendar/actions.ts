"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { db } from "@/server/db";
import { createOrganizationRepository } from "@/server/db/organizations";
import { createGoogleCalendarSyncService } from "@/server/services/google-calendar-sync";
import { createGoogleCalendarRepository } from "@/server/db/google-calendar";

async function getContext() {
  const config = getServerConfig();
  const organization = await createOrganizationRepository(db).getOrCreateInitial({
    name: "G.Lab Studio",
    timezone: config.appTimezone,
  });

  const syncService = createGoogleCalendarSyncService({ db });
  const calendarRepo = createGoogleCalendarRepository(db);

  return { organization, syncService, calendarRepo };
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
    const { organization, syncService } = await getContext();
    const result = await syncService.syncAll(organization.id);

    revalidatePath("/integrations/google-calendar");
    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");

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
    const { organization, syncService } = await getContext();
    await syncService.disconnect(organization.id);

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
 * Updates synchronization options (toggles and checkboxes).
 */
export async function updateGoogleCalendarSettingsAction(
  settings: {
    syncFromGoogle?: boolean;
    syncToGoogle?: boolean;
    syncShoots?: boolean;
    syncMeetings?: boolean;
    syncLocationScout?: boolean;
    syncInternalEvents?: boolean;
  }
): Promise<ActionState> {
  try {
    const { organization, calendarRepo } = await getContext();
    await calendarRepo.updateSettings(organization.id, settings);

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
