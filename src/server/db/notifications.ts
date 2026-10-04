import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  notifications,
  type NewNotification,
  type Notification,
} from "./schema";

export function createNotificationsRepository(database: Database) {
  return {
    async listUserNotifications(
      userId: string,
      limit = 30
    ): Promise<Notification[]> {
      return database
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    },

    async getUnreadCount(userId: string): Promise<number> {
      const [result] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt))
        );

      return result?.count ?? 0;
    },

    async createNotification(data: NewNotification): Promise<Notification> {
      const [notification] = await database
        .insert(notifications)
        .values(data)
        .returning();
      return notification;
    },

    async markAsRead(id: string, userId: string): Promise<boolean> {
      const result = await database
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning({ id: notifications.id });

      return result.length > 0;
    },

    async markAllAsRead(userId: string): Promise<number> {
      const result = await database
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt))
        )
        .returning({ id: notifications.id });

      return result.length;
    },

    async deleteNotification(id: string, userId: string): Promise<boolean> {
      const result = await database
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
        .returning({ id: notifications.id });

      return result.length > 0;
    },
  };
}
