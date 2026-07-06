import { z } from "zod";

/**
 * Body shape accepted by `POST /api/notifications/push` — the JSON produced
 * by the browser's `PushSubscription.toJSON()`. Creation is gated by
 * `canUsePushNotifications` (Premium only) in the route handler.
 */
export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** Body shape accepted by `DELETE /api/notifications/push` — just the
 * endpoint being torn down. Never gated — unsubscribing is always allowed. */
export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export type CreatePushSubscriptionSchema = z.infer<
  typeof createPushSubscriptionSchema
>;
export type DeletePushSubscriptionSchema = z.infer<
  typeof deletePushSubscriptionSchema
>;
