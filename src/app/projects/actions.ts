"use server";

import { revalidatePath } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";

export type ProjectActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getProjectContext() {
  const [{ db }, { createOrganizationRepository }, { createProjectRepository }, { createProjectService }] =
    await Promise.all([
      import("@/server/db"),
      import("@/server/db/organizations"),
      import("@/server/db/projects"),
      import("@/server/services/projects"),
    ]);

  const organization = await createOrganizationRepository(db).getOrCreateInitial({
    name: "G.Lab Studio",
    timezone: getServerConfig().appTimezone,
  });

  return {
    organization,
    service: createProjectService(createProjectRepository(db)),
  };
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  try {
    const { organization, service } = await getProjectContext();
    const result = await service.create(organization.id, {
      name: String(formData.get("name") ?? ""),
      clientName: optionalString(formData, "clientName"),
      status: String(formData.get("status") ?? "planned"),
      startsOn: optionalString(formData, "startsOn"),
      endsOn: optionalString(formData, "endsOn"),
      notes: optionalString(formData, "notes"),
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.error.message,
        fieldErrors: result.error.fieldErrors,
      };
    }

    revalidatePath("/projects");
    return { ok: true, message: "Project created." };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "Unable to create the project right now."),
    };
  }
}

export async function updateProjectAction(
  projectId: string,
  _previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  try {
    const { organization, service } = await getProjectContext();
    const result = await service.update(organization.id, projectId, {
      name: String(formData.get("name") ?? ""),
      clientName: optionalString(formData, "clientName"),
      status: String(formData.get("status") ?? "planned"),
      startsOn: optionalString(formData, "startsOn"),
      endsOn: optionalString(formData, "endsOn"),
      notes: optionalString(formData, "notes"),
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.error.message,
        fieldErrors: result.error.fieldErrors,
      };
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "Project updated." };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "Unable to update the project right now."),
    };
  }
}
