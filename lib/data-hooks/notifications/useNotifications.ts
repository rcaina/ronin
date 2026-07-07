import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

export const notificationsKey = ["notifications"] as const;

/**
 * Recent notifications + unread count for the bell icon and dropdown list.
 * Polls every 60s so the badge updates without a manual refresh (cron only
 * runs daily, but recurring-posted notifications can land any time a
 * template is caught up — see useRecurringCatchUp).
 */
export const useNotifications = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: notificationsKey,
    queryFn: getNotifications,
    enabled: !!session,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
};
