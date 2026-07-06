import type { z } from "zod";
import { notificationSettingsSchema } from "@/lib/types/notification-settings";

/**
 * Body shape accepted by `PATCH /api/users/notification-settings` — any
 * subset of the trigger keys. The service layer merges this over the user's
 * existing (parsed-with-fallback) settings, so omitted keys are untouched.
 * Mirrors `updateFeatureSettingsSchema`.
 */
export const updateNotificationSettingsSchema =
  notificationSettingsSchema.partial();

export type UpdateNotificationSettingsSchema = z.infer<
  typeof updateNotificationSettingsSchema
>;
