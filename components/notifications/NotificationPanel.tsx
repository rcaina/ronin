"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/data-hooks/notifications/useNotifications";
import type { SerializedNotification } from "@/lib/types/notification";
import { getNotificationLink } from "./notificationLink";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Short relative time for a notification's `createdAt` — "Just now", "5m
 * ago", "3h ago", "2d ago", then a plain date once it's more than a week old. */
const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const NotificationRow = ({
  notification,
  onNavigate,
}: {
  notification: SerializedNotification;
  onNavigate: (notification: SerializedNotification) => void;
}) => {
  const isUnread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onNavigate(notification)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 ease-out hover:bg-gray-100 ${
        isUnread ? "bg-secondary/5" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          isUnread ? "bg-secondary" : "bg-transparent"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
};

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleNavigate = (notification: SerializedNotification) => {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }
    const link = getNotificationLink(notification);
    onClose();
    if (link) router.push(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      variant="sheet"
      maxWidth="max-w-md"
      footer={
        unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => markAllRead.mutate()}
            isLoading={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
            <Bell className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-gray-500">
              We&apos;ll let you know about budget thresholds and recurring
              transactions here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
