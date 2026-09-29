"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";

export type ResourceConflictView = { shootId: string; title: string; startsAt: string; endsAt: string };
export type ResourceActionState = { ok: boolean; message?: string; conflicts?: ResourceConflictView[] };

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
    if (!result.ok) return { ok: false, message: result.error.message, conflicts: conflictsForClient(result.error.conflicts) };
    revalidatePath(`/shoots/${shootId}`);
    return { ok: true, message: "Crew member assigned." };
  } catch (error) { return { ok: false, message: errorMessage(error, "Unable to assign crew member.") }; }
}

export async function bookEquipmentAction(shootId: string, _state: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  try {
    const { organization, equipmentService } = await context();
    const result = await equipmentService.book(organization.id, { shootId, equipmentItemId: String(formData.get("equipmentItemId") ?? ""), quantity: String(formData.get("quantity") ?? "1"), notes: String(formData.get("notes") ?? "") });
    if (!result.ok) return { ok: false, message: result.error.message, conflicts: conflictsForClient(result.error.conflicts) };
    revalidatePath(`/shoots/${shootId}`);
    return { ok: true, message: "Equipment booked." };
  } catch (error) { return { ok: false, message: errorMessage(error, "Unable to book equipment.") }; }
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
