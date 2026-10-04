"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { canManageShoot } from "@/server/shoot-ownership";
import { CACHE_TAGS } from "@/server/cache-keys";

async function context() {
  const [{ db }, { requireWorkspaceContext }, { createChecklistRepository }, { createChecklistService }, { createShootRepository }] = await Promise.all([
    import("@/server/db"),
    import("@/server/workspace-context"),
    import("@/server/db/checklists"),
    import("@/server/services/checklists"),
    import("@/server/db/shoots"),
  ]);
  const { user, organization, membership } = await requireWorkspaceContext();
  return {
    user,
    organization,
    membership,
    shootRepository: createShootRepository(db),
    service: createChecklistService(createChecklistRepository(db)),
  };
}

async function editableContext(shootId: string) {
  const ctx = await context();
  const shoot = await ctx.shootRepository.findById(ctx.organization.id, shootId);
  if (!shoot || !canManageShoot(shoot, ctx.user.id, ctx.membership.role, ctx.user.role)) return null;
  return ctx;
}

export async function addChecklistItemAction(shootId: string, formData: FormData) {
  const ctx = await editableContext(shootId);
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const { organization, service } = ctx;
  await service.create(organization.id, {
    shootId,
    title: String(formData.get("title") ?? ""),
    assignedCrewMemberId: String(formData.get("assignedCrewMemberId") ?? ""),
    sortOrder: 0,
  });
  revalidatePath(`/shoots/${shootId}`);
  revalidateTag(CACHE_TAGS.shootDetail(organization.id, shootId));
  revalidateTag(CACHE_TAGS.dashboard(organization.id));
  return { ok: true };
}

export async function toggleChecklistItemAction(shootId: string, itemId: string, completed: boolean) {
  const ctx = await editableContext(shootId);
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const { organization, service } = ctx;
  await service.setCompleted(organization.id, itemId, completed);
  revalidatePath(`/shoots/${shootId}`);
  revalidateTag(CACHE_TAGS.shootDetail(organization.id, shootId));
  revalidateTag(CACHE_TAGS.dashboard(organization.id));
  return { ok: true };
}

export async function removeChecklistItemAction(shootId: string, itemId: string) {
  const ctx = await editableContext(shootId);
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const { organization, service } = ctx;
  await service.remove(organization.id, itemId);
  revalidatePath(`/shoots/${shootId}`);
  revalidateTag(CACHE_TAGS.shootDetail(organization.id, shootId));
  revalidateTag(CACHE_TAGS.dashboard(organization.id));
  return { ok: true };
}
