"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shoots } from "@/server/db/schema";
import { createShootAssigneesRepository } from "@/server/db/shoot-assignees";
import { createNotificationsRepository } from "@/server/db/notifications";
import { requireWorkspaceContext } from "@/server/workspace-context";

const assigneesRepo = createShootAssigneesRepository(db);
const notificationRepo = createNotificationsRepository(db);

export async function respondToShootAssignmentAction(
  shootId: string,
  decision: "accepted" | "declined"
): Promise<{ success: boolean; message: string }> {
  const { user } = await requireWorkspaceContext();
  const assignment = await assigneesRepo.findAssignee(shootId, user.id);

  if (!assignment) {
    return { success: false, message: "Bạn chưa được phân công vào buổi quay này" };
  }
  if (assignment.status !== "pending") {
    return { success: false, message: "Phân công này đã được phản hồi trước đó" };
  }

  const [shoot] = await db.select().from(shoots).where(eq(shoots.id, shootId)).limit(1);
  if (!shoot) {
    return { success: false, message: "Không tìm thấy buổi quay" };
  }

  const updated = await assigneesRepo.updateAssigneeStatus(shootId, user.id, decision);
  if (!updated) {
    return { success: false, message: "Không thể cập nhật trạng thái phân công" };
  }

  if (assignment.assignedBy && assignment.assignedBy !== user.id) {
    const accepted = decision === "accepted";
    await notificationRepo.createNotification({
      organizationId: shoot.organizationId,
      userId: assignment.assignedBy,
      type: accepted ? "EVENT_ASSIGNMENT_ACCEPTED" : "EVENT_ASSIGNMENT_DECLINED",
      title: (user.name || user.email) + (accepted ? " đã xác nhận buổi quay" : " đã từ chối buổi quay"),
      message: (user.name || user.email) + (accepted ? " sẽ tham gia " : " không thể tham gia ") + 'buổi quay "' + shoot.title + '".',
      entityId: shoot.id,
      entityType: "shoot",
    });
  }

  revalidatePath("/shoots/" + shootId);
  revalidatePath("/calendar");
  revalidatePath("/", "layout");

  return {
    success: true,
    message: decision === "accepted" ? "Đã xác nhận tham gia buổi quay" : "Đã từ chối buổi quay",
  };
}
