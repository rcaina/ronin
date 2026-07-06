import { useMutation } from "@tanstack/react-query";
import { env } from "@/env";
import { subscribeToPush, unsubscribeFromPush } from "../services/push";
import {
  getExistingPushSubscription,
  subscribeBrowserToPush,
} from "@/lib/utils/push-client";

/**
 * Subscribes this browser to push: asks the browser for a `PushSubscription`
 * via the service worker already registered for the PWA (see public/sw.js),
 * then registers it with the server. The server call is PREMIUM-gated (see
 * POST /api/notifications/push) — free accounts get an `UpgradeRequiredError`
 * (via `parseErrorResponse`) that callers should catch to open `UpgradeModal`.
 */
export const useSubscribeToPush = () => {
  return useMutation({
    mutationFn: async () => {
      const vapidPublicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Push notifications aren't configured for this app.");
      }

      const subscription = await subscribeBrowserToPush(vapidPublicKey);
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("Failed to create a push subscription.");
      }

      await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      return subscription;
    },
  });
};

/** Tears down this browser's push subscription, both server-side and in the
 * browser itself. A no-op (not an error) if there's nothing to unsubscribe. */
export const useUnsubscribeFromPush = () => {
  return useMutation({
    mutationFn: async () => {
      const subscription = await getExistingPushSubscription();
      if (!subscription) return;

      await unsubscribeFromPush(subscription.endpoint);
      await subscription.unsubscribe();
    },
  });
};
