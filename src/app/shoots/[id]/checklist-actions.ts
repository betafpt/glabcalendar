"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";

async function context() {
  const [{ db }, { createOrganizationRepository }, { createChecklistRepository }, { createChecklistService }] = await Promise.all([
    import("@/server/db"),
    import("@/server/db/organizations"),
    import("@/server/db/checklists"),
    import("@/server/services/checklists"),
  ]);
  const organization = await createOrganizationRepository(db).getOrCreateInitial({ name: "G.Lab Studio", timezone: getServerConfig().appTimezone });
  return { organization, service: createChecklistService(createChecklistRepository(db)) };
}

export async function addChecklistItemAction(shootId: string, formData: FormData) {
  const { organization, service } = await context();
  await service.create(organization.id, {
    shootId,
    title: String(formData.get("title") ?? ""),
    assignedCrewMemberId: String(formData.get("assignedCrewMemberId") ?? ""),
    sortOrder: 0,
  });
  revalidatePath(`/shoots/${shootId}`);
}

export async function toggleChecklistItemAction(shootId: string, itemId: string, completed: boolean) {
  const { organization, service } = await context();
  await service.setCompleted(organization.id, itemId, completed);
  revalidatePath(`/shoots/${shootId}`);
}

export async function removeChecklistItemAction(shootId: string, itemId: string) {
  const { organization, service } = await context();
  await service.remove(organization.id, itemId);
  revalidatePath(`/shoots/${shootId}`);
}
