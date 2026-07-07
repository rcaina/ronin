import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../services/notification-settings";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/types/notification-settings";

export const notificationSettingsKey = [
  "users",
  "notification-settings",
] as const;

/** The current user's own per-trigger notification preferences. */
export const useNotificationSettings = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: notificationSettingsKey,
    queryFn: getNotificationSettings,
    enabled: !!session,
    staleTime: 60 * 1000,
  });
};

/** Convenience default while loading, matching `DEFAULT_NOTIFICATION_SETTINGS`. */
export const useNotificationSettingsOrDefault = () => {
  const { data, ...rest } = useNotificationSettings();
  return { data: data ?? DEFAULT_NOTIFICATION_SETTINGS, ...rest };
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationSettingsKey });
    },
  });
};
