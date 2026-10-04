"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Notification,
  VideoPlay,
  Profile2User,
  CloseCircle,
  TaskSquare,
  TickCircle,
  Trash,
} from "@/components/ui/iconsax";
import { LocalizedText } from "@/components/ui/localized-text";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  deleteNotificationAction,
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/notifications/actions";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityId: string | null;
  entityType: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  const fetchNotifications = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getNotificationsAction();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // Session may have expired; workspace shell handles auth state.
      }
    });
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    const onFocus = () => fetchNotifications();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const target = notifications.find((item) => item.id === id);
    if (!target || target.isRead) return;

    startTransition(async () => {
      await markNotificationReadAction(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = notifications.find((item) => item.id === id);
    if (!target) return;

    startTransition(async () => {
      const result = await deleteNotificationAction(id);
      if (!result.success) return;
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (!target.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "EVENT_ASSIGNED":
        return <VideoPlay size={16} variant="Bold" className="text-pink" />;
      case "EVENT_ASSIGNMENT_ACCEPTED":
        return <TickCircle size={16} variant="Bold" className="text-mint" />;
      case "EVENT_ASSIGNMENT_DECLINED":
      case "EVENT_CANCELLED":
        return <CloseCircle size={16} variant="Bold" className="text-error" />;
      case "EVENT_UPDATED":
        return <TaskSquare size={16} variant="Bold" className="text-butter" />;
      case "INVITATION_RECEIVED":
        return <Profile2User size={16} variant="Bold" className="text-mint" />;
      default:
        return <Notification size={16} variant="Bold" className="text-secondary" />;
    }
  };

  const getEntityUrl = (item: NotificationItem) => {
    if (item.entityType === "shoot" && item.entityId) return `/shoots/${item.entityId}`;
    if (item.entityType === "organization") return "/settings/team";
    return "#";
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) fetchNotifications();
      }}
    >
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          aria-label="Thông báo"
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          className={`relative grid size-11 cursor-pointer place-items-center rounded-full border border-stroke/70 bg-surface text-ink shadow-soft transition hover:bg-white ${className}`}
        >
          <motion.span
            animate={unreadCount > 0 && !reduceMotion ? { rotate: [0, -8, 8, -4, 0] } : undefined}
            transition={{ duration: 0.45 }}
          >
            <Notification size={18} variant="Linear" />
          </motion.span>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-pink text-[10px] font-black text-white shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[min(92vw,390px)] p-3 shadow-nav">
        <div className="flex items-center justify-between border-b border-stroke/70 px-2 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink">
              <LocalizedText vi="Thông báo" en="Notifications" />
            </span>
            {unreadCount > 0 && (
              <span className="rounded-pill bg-pink/20 px-2 py-0.5 text-[10px] font-black text-ink">{unreadCount} mới</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending} className="min-h-8 px-2 text-[10px]">
              Đọc tất cả
            </Button>
          )}
        </div>

        <div className="max-h-[min(65vh,420px)] overflow-y-auto py-1">
          <AnimatePresence initial={false} mode="popLayout">
            {notifications.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-9 text-center text-xs font-medium text-secondary">
                <LocalizedText vi="Không có thông báo nào" en="No notifications yet" />
              </motion.div>
            ) : (
              notifications.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.98 }}
                  className={`group my-1 flex items-start gap-3 rounded-r16 border p-2.5 transition ${
                    item.isRead ? "border-transparent hover:bg-bg" : "border-pink/15 bg-pink/[0.07] hover:bg-pink/10"
                  }`}
                >
                  <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-stroke/70 bg-surface shadow-sm">
                    {getIcon(item.type)}
                  </div>

                  <Link
                    href={getEntityUrl(item)}
                    onClick={() => {
                      if (!item.isRead) handleMarkAsRead(item.id);
                      setIsOpen(false);
                    }}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-xs leading-snug ${item.isRead ? "font-bold" : "font-black"}`}>{item.title}</p>
                      {!item.isRead && <span className="size-2 shrink-0 rounded-full bg-pink" aria-label="Chưa đọc" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-secondary">{item.message}</p>
                    <span className="mt-1 block text-[9px] font-medium text-secondary/70">
                      {new Date(item.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                  </Link>

                  <div className="flex shrink-0 flex-col gap-1">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        disabled={isPending}
                        aria-label="Đánh dấu đã đọc"
                        className="grid size-7 place-items-center rounded-full text-secondary transition hover:bg-white hover:text-ink"
                      >
                        <TickCircle size={14} variant="Linear" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={isPending}
                      aria-label="Xóa thông báo"
                      className="grid size-7 place-items-center rounded-full text-secondary transition hover:bg-error/10 hover:text-error"
                    >
                      <Trash size={14} variant="Linear" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
