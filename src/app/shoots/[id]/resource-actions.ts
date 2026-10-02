"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";

export type ResourceConflictView = { shootId: string; title: string; startsAt: string; endsAt: string };
export type ResourceActionState = { ok: boolean; message?: string; messageVi?: string; messageEn?: string; conflicts?: ResourceConflictView[] };

async function context() {
  const [{ db }, { createOrganizationRepository }, { createShootRepository }, { createCrewAssignmentRepository }, { createEquipmentBookingRepository }, { createCrewAssignmentService }, { createEquipmentBookingService }] = await Promise.all([
    import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/shoots"), import("@/server/db/crew-assignments"), import("@/server/db/equipment-bookings"), import("@/server/services/crew-assignments"), import("@/server/services/equipment-bookings"),
  ]);
  const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone });
  const shootRepository = createShootRepository(db);
  return {
    organization,
    crewService: createCrewAssignmentService(createCrewAssignmentRepository(db), shootRepository),
    equipmentService: createEquipmentBookingService(createEquipmentBookingRepository(db), shootRepository),
  };
}

const conflictsForClient = (items: Array<{ shootId: string; title: string; startsAt: Date; endsAt: Date }> | undefined) => items?.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }));

export async function assignCrewAction(shootId: string, _state: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const { organization, crewService } = await context();
    const result = await crewService.assign(organization.id, { shootId, crewMemberId: String(formData.get("crewMemberId") ?? ""), role: String(formData.get("role") ?? ""), notes: String(formData.get("notes") ?? "") });
    if (!result.ok) return { ok: false, messageVi: result.error.code === "CONFLICT" ? "Nhân sự này đã có lịch ở một buổi quay bị trùng thời gian." : result.error.code === "NOT_FOUND" ? "Không tìm thấy buổi quay." : "Thông tin phân công nhân sự chưa hợp lệ.", messageEn: result.error.message, conflicts: conflictsForClient(result.error.conflicts) };
    revalidatePath(`/shoots/${shootId}`);
    return { ok: true, messageVi: "Đã phân công nhân sự.", messageEn: "Crew member assigned." };
  } catch (error) {
    console.error("assignCrewAction", error);
    return { ok: false, messageVi: "Không thể phân công nhân sự lúc này.", messageEn: "Unable to assign crew member." };
  }
}

export async function bookEquipmentAction(shootId: string, _state: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const { organization, equipmentService } = await context();
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
  const { organization, crewService } = await context();
  await crewService.remove(organization.id, assignmentId);
  revalidatePath(`/shoots/${shootId}`);
}

export async function removeEquipmentBookingAction(shootId: string, bookingId: string) {
  const { organization, equipmentService } = await context();
  await equipmentService.remove(organization.id, bookingId);
  revalidatePath(`/shoots/${shootId}`);
}
