"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { zonedDateTimeLocalToIso } from "@/lib/zoned-datetime";
import type { DeleteActionState } from "@/components/ui/delete-entity-button";
import { canManageShoot } from "@/server/shoot-ownership";
import { CACHE_TAGS } from "@/server/cache-keys";

export type ShootActionState = {
  ok: boolean;
  message?: string;
  messageVi?: string;
  messageEn?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getShootContext() {
  const [{ db }, { requireWorkspaceContext }, { createShootRepository }, { createShootService }] =
    await Promise.all([
      import("@/server/db"),
      import("@/server/workspace-context"),
      import("@/server/db/shoots"),
      import("@/server/services/shoots"),
    ]);

  const { user, organization, membership } = await requireWorkspaceContext();

  return { user, organization, membership, db, service: createShootService(createShootRepository(db)) };
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

function shootInput(formData: FormData, timezone: string) {
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");

  return {
    projectId: optionalString(formData, "projectId"),
    title: String(formData.get("title") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    startsAt: zonedDateTimeLocalToIso(startsAt, timezone),
    endsAt: zonedDateTimeLocalToIso(endsAt, timezone),
    callTime: null,
    locationName: optionalString(formData, "locationName"),
    locationAddress: null,
    notes: optionalString(formData, "notes"),
    syncPolicy: "google" as const,
    isTestData: false,
    sourceCalendarId: null,
    externalEventId: null,
  };
}

export async function createShootAction(
  _previousState: ShootActionState,
  formData: FormData
): Promise<ShootActionState> {
  try {
    const { user, organization, service, db } = await getShootContext();
    const result = await service.create(organization.id, shootInput(formData, organization.timezone), user.id);
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Dữ liệu buổi quay chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };

    // Non-blocking Google Calendar sync
    try {
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      const syncService = createGoogleCalendarSyncService();
      await syncService.syncShootToGoogle(organization.id, user.id, result.data.id);
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed (non-blocking):", syncErr);
    }

    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");
    revalidateTag(CACHE_TAGS.calendar(organization.id));
    revalidateTag(CACHE_TAGS.dashboard(organization.id));
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
    const { user, organization, membership, service, db } = await getShootContext();
    const current = await service.get(organization.id, shootId);
    if (!current) return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    if (!canManageShoot(current, user.id, membership.role, user.role)) {
      return { ok: false, messageVi: "Bạn chỉ có quyền xem lịch quay này.", messageEn: "You have view-only access to this shoot." };
    }
    const result = await service.update(organization.id, shootId, {
      ...shootInput(formData, organization.timezone),
      syncPolicy: current.syncPolicy,
      isTestData: current.isTestData,
      sourceCalendarId: current.sourceCalendarId,
      externalEventId: current.externalEventId,
    });
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Dữ liệu buổi quay chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };

    // Notify assignees about EVENT_UPDATED
    try {
      const { createShootAssigneesRepository } = await import("@/server/db/shoot-assignees");
      const { createNotificationsRepository } = await import("@/server/db/notifications");
      const assignees = await createShootAssigneesRepository(db).listAssigneesForShoot(shootId);
      const notifRepo = createNotificationsRepository(db);
      for (const a of assignees) {
        if (a.assignee.userId !== user.id) {
          await notifRepo.createNotification({
            organizationId: organization.id,
            userId: a.assignee.userId,
            type: "EVENT_UPDATED",
            title: `Buổi quay "${result.data.title}" vừa được cập nhật`,
            message: `Trạng thái: ${result.data.status}. Lịch: ${new Date(result.data.startsAt).toLocaleDateString("vi-VN")}`,
            entityId: shootId,
            entityType: "shoot",
          });
        }
      }
    } catch (notifErr) {
      console.warn("Failed to notify assignees:", notifErr);
    }

    // Non-blocking Google Calendar sync
    try {
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      const syncService = createGoogleCalendarSyncService();
      await syncService.syncShootToGoogle(organization.id, user.id, shootId);
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed (non-blocking):", syncErr);
    }

    revalidatePath("/shoots");
    revalidatePath(`/shoots/${shootId}`);
    revalidatePath("/calendar");
    revalidatePath("/");
    revalidateTag(CACHE_TAGS.calendar(organization.id));
    revalidateTag(CACHE_TAGS.dashboard(organization.id));
    revalidateTag(CACHE_TAGS.shootDetail(organization.id, shootId));
    return { ok: true, messageVi: "Đã cập nhật buổi quay.", messageEn: "Shoot updated." };
  } catch (error) {
    console.error("updateShootAction", error);
    return { ok: false, messageVi: "Không thể cập nhật buổi quay lúc này.", messageEn: "Unable to update the shoot right now." };
  }
}

export async function deleteShootAction(shootId: string, _state: DeleteActionState, _formData: FormData): Promise<DeleteActionState> {
  try {
    const { user, organization, membership, service, db } = await getShootContext();
    const shoot = await service.get(organization.id, shootId);
    if (!shoot) return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    if (!canManageShoot(shoot, user.id, membership.role, user.role)) {
      return { ok: false, messageVi: "Bạn không có quyền xóa lịch quay này.", messageEn: "You cannot delete this shoot." };
    }

    // Notify assignees about EVENT_CANCELLED
    try {
      const { createShootAssigneesRepository } = await import("@/server/db/shoot-assignees");
      const { createNotificationsRepository } = await import("@/server/db/notifications");
      const assignees = await createShootAssigneesRepository(db).listAssigneesForShoot(shootId);
      const notifRepo = createNotificationsRepository(db);
      for (const a of assignees) {
        if (a.assignee.userId !== user.id) {
          await notifRepo.createNotification({
            organizationId: organization.id,
            userId: a.assignee.userId,
            type: "EVENT_CANCELLED",
            title: `Buổi quay "${shoot.title}" đã bị hủy`,
            message: `Buổi quay "${shoot.title}" đã được xóa khỏi hệ thống.`,
            entityId: shootId,
            entityType: "shoot",
          });
        }
      }
    } catch (notifErr) {
      console.warn("Failed to notify assignees about delete:", notifErr);
    }

    try {
      await service.update(organization.id, shootId, { ...shoot, status: "cancelled" });
      const { createGoogleCalendarSyncService } = await import("@/server/services/google-calendar-sync");
      await createGoogleCalendarSyncService().syncShootToGoogle(organization.id, user.id, shootId);
    } catch (syncErr) {
      console.warn("Google Calendar cleanup before shoot delete failed:", syncErr);
    }
    const result = await service.remove(organization.id, shootId);
    if (!result.ok) return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    revalidatePath("/shoots"); revalidatePath("/calendar"); revalidatePath("/projects"); revalidatePath("/");
    revalidateTag(CACHE_TAGS.calendar(organization.id));
    revalidateTag(CACHE_TAGS.dashboard(organization.id));
    revalidateTag(CACHE_TAGS.shootDetail(organization.id, shootId));
  } catch (error) {
    console.error("deleteShootAction", error);
    return { ok: false, messageVi: "Không thể xóa buổi quay lúc này.", messageEn: "Unable to delete the shoot right now." };
  }

  redirect("/shoots");
}

export type RescheduleShootResult =
  | {
      ok: true;
      shootId: string;
      previousStartsAt: string;
      previousEndsAt: string;
      newStartsAt: string;
      newEndsAt: string;
      messageVi: string;
    }
  | {
      ok: false;
      conflict: true;
      shootId: string;
      newStartsAt: string;
      newEndsAt: string;
      previousStartsAt: string;
      previousEndsAt: string;
      conflicts: Array<{
        type: "crew" | "equipment";
        name: string;
        shootTitle: string;
      }>;
      messageVi: string;
    }
  | {
      ok: false;
      conflict?: false;
      messageVi: string;
      messageEn?: string;
    };

export async function rescheduleShootAction(input: {
  shootId: string;
  startsAt: string;
  endsAt: string;
  force?: boolean;
}): Promise<RescheduleShootResult> {
  try {
    const [
      { db },
      { requireWorkspaceContext },
      { createShootRepository },
      { createCrewAssignmentRepository },
      { createEquipmentBookingRepository },
    ] = await Promise.all([
      import("@/server/db"),
      import("@/server/workspace-context"),
      import("@/server/db/shoots"),
      import("@/server/db/crew-assignments"),
      import("@/server/db/equipment-bookings"),
    ]);

    const { user, organization, membership } = await requireWorkspaceContext();

    const shootRepo = createShootRepository(db);
    const shoot = await shootRepo.findById(organization.id, input.shootId);
    if (!shoot) {
      return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    }
    if (!canManageShoot(shoot, user.id, membership.role, user.role)) {
      return { ok: false, messageVi: "Bạn chỉ có quyền xem lịch quay này.", messageEn: "You have view-only access to this shoot." };
    }

    const targetStart = new Date(input.startsAt);
    const targetEnd = new Date(input.endsAt);

    if (
      Number.isNaN(targetStart.getTime()) ||
      Number.isNaN(targetEnd.getTime()) ||
      targetStart >= targetEnd
    ) {
      return { ok: false, messageVi: "Thời gian buổi quay không hợp lệ.", messageEn: "Invalid shoot time range." };
    }

    if (!input.force) {
      const crewRepo = createCrewAssignmentRepository(db);
      const equipmentRepo = createEquipmentBookingRepository(db);

      const [assignedCrew, bookedEquipment] = await Promise.all([
        crewRepo.listForShoot(organization.id, input.shootId),
        equipmentRepo.listForShoot(organization.id, input.shootId),
      ]);

      const crewMap = new Map(
        assignedCrew.map((c) => [c.assignment.crewMemberId, c.crewMember.name])
      );
      const equipmentMap = new Map(
        bookedEquipment.map((b) => [b.booking.equipmentItemId, b.equipmentItem.name])
      );

      const [crewConflicts, equipmentConflicts] = await Promise.all([
        crewRepo.findConflictsForCrewMembers(
          organization.id,
          assignedCrew.map((c) => c.assignment.crewMemberId),
          input.shootId,
          targetStart,
          targetEnd
        ),
        equipmentRepo.findConflictsForEquipmentItems(
          organization.id,
          bookedEquipment.map((b) => b.booking.equipmentItemId),
          input.shootId,
          targetStart,
          targetEnd
        ),
      ]);

      if (crewConflicts.length > 0 || equipmentConflicts.length > 0) {
        return {
          ok: false,
          conflict: true,
          shootId: input.shootId,
          newStartsAt: input.startsAt,
          newEndsAt: input.endsAt,
          previousStartsAt: shoot.startsAt.toISOString(),
          previousEndsAt: shoot.endsAt.toISOString(),
          conflicts: [
            ...crewConflicts.map((c) => ({
              type: "crew" as const,
              name: crewMap.get(c.crewMemberId) ?? "Nhân sự",
              shootTitle: c.title,
            })),
            ...equipmentConflicts.map((e) => ({
              type: "equipment" as const,
              name: equipmentMap.get(e.equipmentItemId) ?? "Thiết bị",
              shootTitle: e.title,
            })),
          ],
          messageVi: `Phát hiện xung đột lịch (${crewConflicts.length + equipmentConflicts.length} cảnh báo).`,
        };
      }
    }

    await shootRepo.update(organization.id, input.shootId, {
      startsAt: targetStart,
      endsAt: targetEnd,
    });

    try {
      const { createGoogleCalendarSyncService } = await import(
        "@/server/services/google-calendar-sync"
      );
      await createGoogleCalendarSyncService().syncShootToGoogle(
        organization.id,
        user.id,
        input.shootId
      );
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed after reschedule:", syncErr);
    }

    revalidatePath("/calendar");
    revalidatePath("/shoots");
    revalidatePath(`/shoots/${input.shootId}`);
    revalidatePath("/");
    revalidateTag(CACHE_TAGS.calendar(organization.id));
    revalidateTag(CACHE_TAGS.dashboard(organization.id));
    revalidateTag(CACHE_TAGS.shootDetail(organization.id, input.shootId));

    return {
      ok: true,
      shootId: input.shootId,
      previousStartsAt: shoot.startsAt.toISOString(),
      previousEndsAt: shoot.endsAt.toISOString(),
      newStartsAt: input.startsAt,
      newEndsAt: input.endsAt,
      messageVi: "Đã dời lịch buổi quay thành công.",
    };
  } catch (error) {
    console.error("rescheduleShootAction", error);
    return { ok: false, messageVi: "Không thể dời lịch buổi quay lúc này.", messageEn: "Unable to reschedule shoot." };
  }
}

export async function updateShootStatusAction(
  shootId: string,
  newStatus: string
): Promise<{ ok: boolean; messageVi?: string; messageEn?: string }> {
  try {
    const { user, organization, membership, service } = await getShootContext();
    const { shootStatusSchema } = await import("@/server/services/shoots");
    const parsed = shootStatusSchema.safeParse(newStatus);
    if (!parsed.success) {
      return { ok: false, messageVi: "Trạng thái không hợp lệ.", messageEn: "Invalid status." };
    }
    const current = await service.get(organization.id, shootId);
    if (!current) {
      return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    }
    if (!canManageShoot(current, user.id, membership.role, user.role)) {
      return { ok: false, messageVi: "Bạn chỉ có quyền xem lịch quay này.", messageEn: "You have view-only access to this shoot." };
    }

    await service.update(organization.id, shootId, {
      projectId: current.projectId,
      title: current.title,
      status: parsed.data,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      callTime: current.callTime,
      locationName: current.locationName,
      locationAddress: current.locationAddress,
      notes: current.notes,
      syncPolicy: current.syncPolicy,
      isTestData: current.isTestData,
      sourceCalendarId: current.sourceCalendarId,
      externalEventId: current.externalEventId,
    });

    try {
      if (current.syncPolicy === "google" && !current.isTestData) {
        const { createGoogleCalendarSyncService } = await import(
          "@/server/services/google-calendar-sync"
        );
        await createGoogleCalendarSyncService().syncShootToGoogle(
          organization.id,
          user.id,
          shootId
        );
      }
    } catch (syncErr) {
      console.warn("Background Google Calendar sync failed after status change:", syncErr);
    }

    revalidatePath(`/shoots/${shootId}`);
    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");

    const { getStatusLabel } = await import("@/lib/status-labels");
    return {
      ok: true,
      messageVi: `Đã chuyển sang "${getStatusLabel(parsed.data, "vi")}".`,
      messageEn: `Changed status to "${getStatusLabel(parsed.data, "en")}".`,
    };
  } catch (error) {
    console.error("updateShootStatusAction", error);
    return {
      ok: false,
      messageVi: "Không thể cập nhật trạng thái lúc này.",
      messageEn: "Unable to update status at this time.",
    };
  }
}

export async function disableGoogleSyncForShootAction(
  shootId: string
): Promise<{ ok: boolean; messageVi?: string; messageEn?: string }> {
  try {
    const { user, organization, membership, service } = await getShootContext();
    const current = await service.get(organization.id, shootId);
    if (!current) {
      return { ok: false, messageVi: "Không tìm thấy buổi quay.", messageEn: "Shoot not found." };
    }
    if (!canManageShoot(current, user.id, membership.role, user.role)) {
      return { ok: false, messageVi: "Bạn chỉ có quyền xem lịch quay này.", messageEn: "You have view-only access to this shoot." };
    }

    const result = await service.update(organization.id, shootId, {
      projectId: current.projectId,
      title: current.title,
      status: current.status,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      callTime: current.callTime,
      locationName: current.locationName,
      locationAddress: current.locationAddress,
      notes: current.notes,
      syncPolicy: "local_only",
      isTestData: current.isTestData,
      sourceCalendarId: current.sourceCalendarId,
      externalEventId: current.externalEventId,
    });
    if (!result.ok) {
      return { ok: false, messageVi: "Không thể tắt đồng bộ cho lịch này.", messageEn: result.error.message };
    }

    revalidatePath(`/shoots/${shootId}`);
    revalidatePath("/shoots");
    revalidatePath("/calendar");
    return {
      ok: true,
      messageVi: "Đã tắt đồng bộ Google Calendar cho lịch này.",
      messageEn: "Google Calendar sync is disabled for this shoot.",
    };
  } catch (error) {
    console.error("disableGoogleSyncForShootAction", error);
    return {
      ok: false,
      messageVi: "Không thể tắt đồng bộ cho lịch này lúc này.",
      messageEn: "Unable to disable sync for this shoot right now.",
    };
  }
}
