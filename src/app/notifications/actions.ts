"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { createNotificationsRepository } from "@/server/db/notifications";
import { requireWorkspaceContext } from "@/server/workspace-context";

const notificationRepo = createNotificationsRepository(db);

export async function getNotificationsAction() {
  const { user } = await requireWorkspaceContext();
  const notifications = await notificationRepo.listUserNotifications(user.id, 20);
  const unreadCount = await notificationRepo.getUnreadCount(user.id);

  return {
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      entityId: item.entityId,
      entityType: item.entityType,
      isRead: Boolean(item.readAt),
      createdAt: item.createdAt,
    })),
    unreadCount,
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const { user } = await requireWorkspaceContext();
  await notificationRepo.markAsRead(notificationId, user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const { user } = await requireWorkspaceContext();
  await notificationRepo.markAllAsRead(user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteNotificationAction(notificationId: string) {
  const { user } = await requireWorkspaceContext();
  const deleted = await notificationRepo.deleteNotification(notificationId, user.id);
  revalidatePath("/", "layout");
  return { success: deleted };
}
