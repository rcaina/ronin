import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../errors";
import {
  parseNotificationSettings,
  type NotificationSettings,
} from "../types/notification-settings";
import type { UpdateNotificationSettingsSchema } from "../api-schemas/notification-settings";

type UserPrisma = Pick<PrismaClient, "user">;

/** Loads a user's per-trigger notification preferences, parsed-with-fallback. */
export const getNotificationSettings = async (
  prisma: UserPrisma,
  userId: string,
): Promise<NotificationSettings> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationSettings: true },
  });

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  return parseNotificationSettings(user.notificationSettings);
};

/**
 * Merges `patch` over the user's existing (parsed-with-fallback) notification
 * settings and persists the full, complete object. Mirrors
 * `updateFeatureSettings`, scoped to a user instead of an account.
 */
export const updateNotificationSettings = async (
  tx: UserPrisma,
  userId: string,
  patch: UpdateNotificationSettingsSchema,
): Promise<NotificationSettings> => {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { notificationSettings: true },
  });

  if (!user) {
    throw new HttpError("User not found", 404);
  }

  const current = parseNotificationSettings(user.notificationSettings);
  const merged: NotificationSettings = { ...current, ...patch };

  await tx.user.update({
    where: { id: userId },
    data: { notificationSettings: merged as Prisma.InputJsonValue },
  });

  return merged;
};
