import type {
  NotificationListResponse,
  SerializedNotification,
} from "@/lib/types/notification";
import { parseErrorResponse } from "./http";

export const getNotifications = async (): Promise<NotificationListResponse> => {
  const response = await fetch("/api/notifications");
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<NotificationListResponse>;
};

export const markNotificationRead = async (
  id: string,
): Promise<SerializedNotification> => {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
  });
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<SerializedNotification>;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
  });
  if (!response.ok) return parseErrorResponse(response);
};
