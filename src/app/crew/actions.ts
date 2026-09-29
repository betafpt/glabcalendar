"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";

export type CrewActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> };

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
});

export async function createCrewAction(_state: CrewActionState, formData: FormData): Promise<CrewActionState> {
  try {
    const { organization, service } = await context();
    const result = await service.create(organization.id, input(formData));
    if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: result.error.fieldErrors };
    revalidatePath("/crew");
    return { ok: true, message: "Crew member created." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "Unable to create crew member.") };
  }
}

export async function updateCrewAction(id: string, _state: CrewActionState, formData: FormData): Promise<CrewActionState> {
  try {
    const { organization, service } = await context();
    const result = await service.update(organization.id, id, input(formData));
    if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: result.error.fieldErrors };
    revalidatePath("/crew"); revalidatePath(`/crew/${id}`);
    return { ok: true, message: "Crew member updated." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "Unable to update crew member.") };
  }
}
