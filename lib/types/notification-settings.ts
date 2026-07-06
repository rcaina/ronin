import { z } from "zod";

/**
 * Per-user notification trigger preferences (see `User.notificationSettings`
 * in prisma/schema.prisma). Distinct from the account-wide `notifications`
 * feature toggle in `lib/types/feature-settings.ts`, which is the MASTER
 * switch — when the account has `notifications` disabled the whole section
 * is off for every member regardless of these per-user preferences (see
 * `useFeatureSettings` + the Notifications settings tab).
 */
export const NOTIFICATION_TRIGGER_KEYS = [
  "categoryThreshold",
  "budgetPeriodEnding",
  "recurringPosted",
] as const;

export type NotificationTriggerKey = (typeof NOTIFICATION_TRIGGER_KEYS)[number];

export const notificationSettingsSchema = z.object({
  categoryThreshold: z.boolean(),
  budgetPeriodEnding: z.boolean(),
  recurringPosted: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** Every trigger starts enabled — toggles are opt-out, not opt-in. */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  categoryThreshold: true,
  budgetPeriodEnding: true,
  recurringPosted: true,
};

/**
 * Parses a user's stored `notificationSettings` JSON into a complete
 * `NotificationSettings` object. Merges over `DEFAULT_NOTIFICATION_SETTINGS`
 * key by key, exactly like `parseFeatureSettings`: `null` (never configured)
 * resolves to all-defaults, missing/malformed keys fall back individually,
 * and this never throws.
 */
export const parseNotificationSettings = (
  json: unknown,
): NotificationSettings => {
  const source =
    json !== null && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};

  const result = { ...DEFAULT_NOTIFICATION_SETTINGS };
  for (const key of NOTIFICATION_TRIGGER_KEYS) {
    const value = source[key];
    if (typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
};

/** Metadata for a trigger toggle rendered on the Notifications settings tab. */
export interface NotificationTriggerToggle {
  key: NotificationTriggerKey;
  label: string;
  description: string;
}

export const NOTIFICATION_TRIGGERS: readonly NotificationTriggerToggle[] = [
  {
    key: "categoryThreshold",
    label: "Category nearing budget",
    description: "When a category reaches 90% of its allocated amount.",
  },
  {
    key: "budgetPeriodEnding",
    label: "Budget period ending",
    description: "When your active budget period ends within 3 days.",
  },
  {
    key: "recurringPosted",
    label: "Recurring transaction posted",
    description: "When a recurring transaction is automatically posted.",
  },
];
