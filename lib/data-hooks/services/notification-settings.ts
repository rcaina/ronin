import type { NotificationSettings } from "@/lib/types/notification-settings";
import { parseErrorResponse } from "./http";

export const getNotificationSettings =
  async (): Promise<NotificationSettings> => {
    const response = await fetch("/api/users/notification-settings");
    if (!response.ok) return parseErrorResponse(response);
    return response.json() as Promise<NotificationSettings>;
  };

export const updateNotificationSettings = async (
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> => {
  const response = await fetch("/api/users/notification-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<NotificationSettings>;
};
