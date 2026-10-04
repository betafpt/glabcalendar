"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import { canManageShoot } from "@/server/shoot-ownership";

export type ResourceConflictView = { shootId: string; title: string; startsAt: string; endsAt: string };
export type ResourceActionState = { ok: boolean; message?: string; messageVi?: string; messageEn?: string; conflicts?: ResourceConflictView[] };

async function context() {
  const [{ db }, { requireWorkspaceContext }, { createShootRepository }, { createCrewAssignmentRepository }, { createEquipmentBookingRepository }, { createCrewAssignmentService }, { createEquipmentBookingService }] = await Promise.all([
    import("@/server/db"), import("@/server/workspace-context"), import("@/server/db/shoots"), import("@/server/db/crew-assignments"), import("@/server/db/equipment-bookings"), import("@/server/services/crew-assignments"), import("@/server/services/equipment-bookings"),
  ]);
  const { user, organization, membership } = await requireWorkspaceContext();
  const shootRepository = createShootRepository(db);
  return {
    db,
    user,
    organization,
    membership,
    shootRepository,
    crewService: createCrewAssignmentService(createCrewAssignmentRepository(db), shootRepository),
    equipmentService: createEquipmentBookingService(createEquipmentBookingRepository(db), shootRepository),
  };
}

async function canManage(shootId: string) {
  const ctx = await context();
  const shoot = await ctx.shootRepository.findById(ctx.organization.id, shootId);
  return { ctx, shoot, allowed: Boolean(shoot && canManageShoot(shoot, ctx.user.id, ctx.membership.role, ctx.user.role)) };
}

const conflictsForClient = (items: Array<{ shootId: string; title: string; startsAt: Date; endsAt: Date }> | undefined) => items?.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }));

export async function assignCrewAction(shootId: string, _state: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const { ctx, shoot, allowed } = await canManage(shootId);
    if (!allowed) return { ok: false, messageVi: "Bạn chỉ có quyền xem buổi quay này.", messageEn: "This shoot is view-only for your account." };
    const { organization, crewService, db, user } = ctx;
    const crewMemberId = String(formData.get("crewMemberId") ?? "");
    const normalizedEmail = String(formData.get("accountEmail") ?? "").trim().toLowerCase();
    let linkedUser: { id: string; name: string | null; email: string } | null = null;

    if (normalizedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { ok: false, messageVi: "Email tài khoản G.Lab không hợp lệ.", messageEn: "Invalid G.Lab account email." };
      }
      const { createInvitationsRepository } = await import("@/server/db/invitations");
      const found = await createInvitationsRepository(db).findUserByExactEmail(normalizedEmail);
      if (!found) {
        return { ok: false, messageVi: "Không tìm thấy tài khoản G.Lab với email này.", messageEn: "No G.Lab account found for this email." };
      }
      linkedUser = { id: found.id, name: found.name, email: found.email };
    }

    const result = await crewService.assign(organization.id, { shootId, crewMemberId, role: String(formData.get("role") ?? ""), notes: String(formData.get("notes") ?? "") });
    if (!result.ok) return { ok: false, messageVi: result.error.code === "CONFLICT" ? "Nhân sự này đã có lịch ở một buổi quay bị trùng thời gian." : result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Thông tin phân công nhân sự chưa hợp lệ.", messageEn: result.error.message, conflicts: conflictsForClient(result.error.conflicts) };

    if (linkedUser) {
      const [{ createCrewRepository }, { createShootAssigneesRepository }, { createNotificationsRepository }] = await Promise.all([
        import("@/server/db/crew"),
        import("@/server/db/shoot-assignees"),
        import("@/server/db/notifications"),
      ]);
      await createCrewRepository(db).update(organization.id, crewMemberId, {
        userId: linkedUser.id,
        email: linkedUser.email,
      });
      await createShootAssigneesRepository(db).assignUserToShoot({
        shootId,
        userId: linkedUser.id,
        role: "MEMBER",
        status: linkedUser.id === user.id ? "accepted" : "pending",
        assignedBy: user.id,
      });
      if (linkedUser.id !== user.id && shoot) {
        await createNotificationsRepository(db).createNotification({
          organizationId: organization.id,
          userId: linkedUser.id,
          type: "EVENT_ASSIGNED",
          title: `Bạn được phân công vào buổi quay "${shoot.title}"`,
          message: `${user.name || user.email} đã phân công bạn vào buổi quay "${shoot.title}" (${new Date(shoot.startsAt).toLocaleDateString("vi-VN")}).`,
          entityId: shoot.id,
          entityType: "shoot",
        });
      }
    }
    revalidatePath(`/shoots/${shootId}`);
    revalidatePath("/calendar");
    revalidatePath("/", "layout");
    return { ok: true, messageVi: "Đã phân công nhân sự.", messageEn: "Crew member assigned." };
  } catch (error) {
    console.error("assignCrewAction", error);
    return { ok: false, messageVi: "Không thể phân công nhân sự lúc này.", messageEn: "Unable to assign crew member." };
  }
}

export async function bookEquipmentAction(shootId: string, _state: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const { ctx, allowed } = await canManage(shootId);
    if (!allowed) return { ok: false, messageVi: "Bạn chỉ có quyền xem buổi quay này.", messageEn: "This shoot is view-only for your account." };
    const { organization, equipmentService } = ctx;
    const result = await equipmentService.book(organization.id, { shootId, equipmentItemId: String(formData.get("equipmentItemId") ?? ""), quantity: String(formData.get("quantity") ?? "1"), notes: String(formData.get("notes") ?? "") });
    if (!result.ok) return { ok: false, messageVi: result.error.code === "CONFLICT" ? "Thiết bị này đã được đặt cho một buổi quay bị trùng thời gian." : result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Thông tin đặt thiết bị chưa hợp lệ.", messageEn: result.error.message, conflicts: conflictsForClient(result.error.conflicts) };
    revalidatePath(`/shoots/${shootId}`);
    return { ok: true, messageVi: "Đã đặt thiết bị.", messageEn: "Equipment booked." };
  } catch (error) {
    console.error("bookEquipmentAction", error);
    return { ok: false, messageVi: "Không thể đặt thiết bị lúc này.", messageEn: "Unable to book equipment." };
  }
}

export async function removeCrewAssignmentAction(shootId: string, assignmentId: string) {
  const { ctx, allowed } = await canManage(shootId);
  if (!allowed) return;
  const { organization, crewService } = ctx;
  await crewService.remove(organization.id, assignmentId);
  revalidatePath(`/shoots/${shootId}`);
}

export async function removeEquipmentBookingAction(shootId: string, bookingId: string) {
  const { ctx, allowed } = await canManage(shootId);
  if (!allowed) return;
  const { organization, equipmentService } = ctx;
  await equipmentService.remove(organization.id, bookingId);
  revalidatePath(`/shoots/${shootId}`);
}
