"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { errorMessage } from "@/lib/error-message";
import type { DeleteActionState } from "@/components/ui/delete-entity-button";
import { CALENDAR_PROJECT_OPTIONS_TAG } from "@/server/calendar-filter-options";
import { SHOOT_DETAIL_PROJECT_OPTIONS_TAG } from "@/server/shoot-detail-options";
import { CACHE_TAGS } from "@/server/cache-keys";

export type ProjectActionState = {
  ok: boolean;
  message?: string;
  messageVi?: string;
  messageEn?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function getProjectContext() {
  const [{ db }, { requireWorkspaceContext }, { createProjectRepository }, { createProjectService }] =
    await Promise.all([
      import("@/server/db"),
      import("@/server/workspace-context"),
      import("@/server/db/projects"),
      import("@/server/services/projects"),
    ]);

  const { organization, membership } = await requireWorkspaceContext();

  return {
    organization,
    membership,
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
      coverImageUrl: optionalString(formData, "coverImageUrl"),
    });

    if (!result.ok) {
      return {
        ok: false,
        messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy dự án." : "Dữ liệu dự án chưa hợp lệ.",
        messageEn: result.error.message,
        fieldErrors: result.error.fieldErrors,
      };
    }

    revalidatePath("/projects");
    revalidateTag(CALENDAR_PROJECT_OPTIONS_TAG);
    revalidateTag(SHOOT_DETAIL_PROJECT_OPTIONS_TAG);
    revalidateTag(CACHE_TAGS.projects(organization.id));
    return { ok: true, messageVi: "Đã tạo dự án.", messageEn: "Project created." };
  } catch (error) {
    console.error("createProjectAction", error);
    return {
      ok: false,
      messageVi: "Không thể tạo dự án lúc này.",
      messageEn: "Unable to create the project right now.",
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
      coverImageUrl: optionalString(formData, "coverImageUrl"),
    });

    if (!result.ok) {
      return {
        ok: false,
        messageVi: result.error.code === "NOT_FOUND" ? "Không tìm thấy dự án." : "Dữ liệu dự án chưa hợp lệ.",
        messageEn: result.error.message,
        fieldErrors: result.error.fieldErrors,
      };
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidateTag(CALENDAR_PROJECT_OPTIONS_TAG);
    revalidateTag(SHOOT_DETAIL_PROJECT_OPTIONS_TAG);
    revalidateTag(CACHE_TAGS.projects(organization.id));
    return { ok: true, messageVi: "Đã cập nhật dự án.", messageEn: "Project updated." };
  } catch (error) {
    console.error("updateProjectAction", error);
    return {
      ok: false,
      messageVi: "Không thể cập nhật dự án lúc này.",
      messageEn: "Unable to update the project right now.",
    };
  }
}

export async function deleteProjectAction(projectId: string, _state: DeleteActionState, _formData: FormData): Promise<DeleteActionState> {
  try {
    const { organization, service } = await getProjectContext();
    const result = await service.remove(organization.id, projectId);
    if (!result.ok) return { ok: false, messageVi: "Không tìm thấy dự án.", messageEn: "Project not found." };
    revalidatePath("/projects");
    revalidatePath("/shoots");
    revalidatePath("/calendar");
    revalidatePath("/");
    revalidateTag(CALENDAR_PROJECT_OPTIONS_TAG);
    revalidateTag(SHOOT_DETAIL_PROJECT_OPTIONS_TAG);
    revalidateTag(CACHE_TAGS.projects(organization.id));
    return { ok: true };
  } catch (error) {
    console.error("deleteProjectAction", error);
    return { ok: false, messageVi: "Không thể xóa dự án lúc này.", messageEn: "Unable to delete the project right now." };
  }
}
