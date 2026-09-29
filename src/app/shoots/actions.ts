"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";

export type ShootActionState = {
  ok: boolean;
  message?: string;
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

function shootInput(formData: FormData) {
  return {
    projectId: optionalString(formData, "projectId"),
    title: String(formData.get("title") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    callTime: optionalString(formData, "callTime"),
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
    const result = await service.create(organization.id, shootInput(formData));
    if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: result.error.fieldErrors };

    revalidatePath("/shoots");
    return { ok: true, message: "Shoot created." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "Unable to create the shoot right now.") };
  }
}

export async function updateShootAction(
  shootId: string,
  _previousState: ShootActionState,
  formData: FormData
): Promise<ShootActionState> {
  try {
    const { organization, service } = await getShootContext();
    const result = await service.update(organization.id, shootId, shootInput(formData));
    if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: result.error.fieldErrors };

    revalidatePath("/shoots");
    revalidatePath(`/shoots/${shootId}`);
    return { ok: true, message: "Shoot updated." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "Unable to update the shoot right now.") };
  }
}
