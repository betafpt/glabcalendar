"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { zonedDateTimeLocalToIso } from "@/lib/zoned-datetime";
import type { DeleteActionState } from "@/components/ui/delete-entity-button";

export type ShootActionState = {
  ok: boolean;
  message?: string;
  messageVi?: string;
  messageEn?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getShootContext() {
  const [{ db }, { createOrganizationRepository }, { createShootRepository }, { createShootService }] =
    await Promise.all([
      import("@/server/db"),
      import("@/server/db/organizations"),
      import("@/server/db/shoots"),
      import("@/server/services/shoots"),
    ]);

  const organization = await createOrganizationRepository(db).getOrCreateInitial({
    name: "G.Lab Studio",
    timezone: getServerConfig().appTimezone,
  });

  return { organization, service: createShootService(createShootRepository(db)) };
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

function shootInput(formData: FormData, timezone: string) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const callTime = optionalString(formData, "callTime");
  return {
    projectId: optionalString(formData, "projectId"),
    title: String(formData.get("title") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    startsAt: zonedDateTimeLocalToIso(startsAt, timezone),
    endsAt: zonedDateTimeLocalToIso(endsAt, timezone),
    callTime: callTime ? zonedDateTimeLocalToIso(callTime, timezone) : null,
    locationName: optionalString(formData, "locationName"),
    locationAddress: optionalString(formData, "locationAddress"),
    notes: optionalString(formData, "notes"),
  };
}

export async function createShootAction(
  _previousState: ShootActionState,
  formData: FormData
): Promise<ShootActionState> {
  try {
    const { organization, service } = await getShootContext();
    const result = await service.create(organization.id, shootInput(formData, organization.timezone));
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Dữ liệu buổi quay chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };

    // Non-blocking Google Calendar sync
    try {
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      const syncService = createGoogleCalendarSyncService();
      await syncService.syncShootToGoogle(organization.id, result.data.id);
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed (non-blocking):", syncErr);
    }

    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true, messageVi: "Đã tạo buổi quay.", messageEn: "Shoot created." };
  } catch (error) {
    console.error("createShootAction", error);
    return { ok: false, messageVi: "Không thể tạo buổi quay lúc này.", messageEn: "Unable to create the shoot right now." };
  }
}

export async function updateShootAction(
  shootId: string,
  _previousState: ShootActionState,
  formData: FormData
): Promise<ShootActionState> {
  try {
    const { organization, service } = await getShootContext();
    const result = await service.update(organization.id, shootId, shootInput(formData, organization.timezone));
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Dữ liệu buổi quay chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };

    // Non-blocking Google Calendar sync
    try {
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      const syncService = createGoogleCalendarSyncService();
      await syncService.syncShootToGoogle(organization.id, shootId);
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed (non-blocking):", syncErr);
    }

    revalidatePath("/shoots");
    revalidatePath(`/shoots/${shootId}`);
    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true, messageVi: "Đã cập nhật buổi quay.", messageEn: "Shoot updated." };
  } catch (error) {
    console.error("updateShootAction", error);
    return { ok: false, messageVi: "Không thể cập nhật buổi quay lúc này.", messageEn: "Unable to update the shoot right now." };
  }
}

export async function deleteShootAction(shootId: string, _state: DeleteActionState, _formData: FormData): Promise<DeleteActionState> {
  try {
    const { organization, service } = await getShootContext();
    const shoot = await service.get(organization.id, shootId);
    if (!shoot) return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    try {
      await service.update(organization.id, shootId, { ...shoot, status: "cancelled" });
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      await createGoogleCalendarSyncService().syncShootToGoogle(organization.id, shootId);
    } catch (syncErr) {
      console.warn("Google Calendar cleanup before shoot delete failed:", syncErr);
    }
    const result = await service.remove(organization.id, shootId);
    if (!result.ok) return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    revalidatePath("/shoots"); revalidatePath("/calendar"); revalidatePath("/projects"); revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("deleteShootAction", error);
    return { ok: false, messageVi: "Không thể xóa buổi quay lúc này.", messageEn: "Unable to delete the shoot right now." };
  }
}
