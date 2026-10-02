"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { DeleteActionState } from "@/components/ui/delete-entity-button";
import { CALENDAR_CREW_OPTIONS_TAG } from "@/server/calendar-filter-options";
import { SHOOT_DETAIL_CREW_OPTIONS_TAG } from "@/server/shoot-detail-options";

export type CrewActionState = { ok: boolean; message?: string; messageVi?: string; messageEn?: string; fieldErrors?: Record<string, string[] | undefined> };

async function context() {
  const [{ db }, { createOrganizationRepository }, { createCrewRepository }, { createCrewService }] = await Promise.all([
    import("@/server/db"), import("@/server/db/organizations"), import("@/server/db/crew"), import("@/server/services/crew"),
  ]);
  const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone });
  return { organization, service: createCrewService(createCrewRepository(db)) };
}

const optional = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
};

const input = (formData: FormData) => ({
  name: String(formData.get("name") ?? ""),
  defaultRole: optional(formData, "defaultRole"),
  phone: optional(formData, "phone"),
  email: optional(formData, "email"),
  status: String(formData.get("status") ?? "active"),
  notes: optional(formData, "notes"),
  avatarDataUrl: optional(formData, "avatarDataUrl"),
});

export async function createCrewAction(_state: CrewActionState, formData: FormData): Promise<CrewActionState> {
  try {
    const { organization, service } = await context();
    const result = await service.create(organization.id, input(formData));
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy nhân sự." : "Dữ liệu nhân sự chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };
    revalidatePath("/crew");
    revalidateTag(CALENDAR_CREW_OPTIONS_TAG);
    revalidateTag(SHOOT_DETAIL_CREW_OPTIONS_TAG);
    return { ok: true, messageVi: "Đã thêm nhân sự.", messageEn: "Crew member created." };
  } catch (error) {
    console.error("createCrewAction", error);
    return { ok: false, messageVi: "Không thể thêm nhân sự lúc này.", messageEn: "Unable to create crew member." };
  }
}

export async function updateCrewAction(id: string, _state: CrewActionState, formData: FormData): Promise<CrewActionState> {
  try {
    const { organization, service } = await context();
    const result = await service.update(organization.id, id, input(formData));
    if (!result.ok) return { ok: false, messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy nhân sự." : "Dữ liệu nhân sự chưa hợp lệ.", messageEn: result.error.message, fieldErrors: result.error.fieldErrors };
    revalidatePath("/crew"); revalidatePath(`/crew/${id}`); revalidateTag(CALENDAR_CREW_OPTIONS_TAG); revalidateTag(SHOOT_DETAIL_CREW_OPTIONS_TAG);
    return { ok: true, messageVi: "Đã cập nhật nhân sự.", messageEn: "Crew member updated." };
  } catch (error) {
    console.error("updateCrewAction", error);
    return { ok: false, messageVi: "Không thể cập nhật nhân sự lúc này.", messageEn: "Unable to update crew member." };
  }
}

export async function deleteCrewAction(id: string, _state: DeleteActionState, _formData: FormData): Promise<DeleteActionState> {
  try {
    const { organization, service } = await context();
    const result = await service.remove(organization.id, id);
    if (!result.ok) return { ok: false, messageVi: "Không tìm thấy nhân sự.", messageEn: "Crew member not found." };
    revalidatePath("/crew");
    revalidatePath("/shoots");
    revalidateTag(CALENDAR_CREW_OPTIONS_TAG);
    revalidateTag(SHOOT_DETAIL_CREW_OPTIONS_TAG);
    return { ok: true };
  } catch (error) {
    console.error("deleteCrewAction", error);
    return { ok: false, messageVi: "Không thể xóa nhân sự vì vẫn đang được phân công vào buổi quay. Hãy gỡ các phân công trước.", messageEn: "This crew member is still assigned to shoots. Remove those assignments first." };
  }
}
