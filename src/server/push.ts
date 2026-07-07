import webPush from "web-push";
import { env } from "@/env";

/**
 * Thin wrapper around the `web-push` library for sending web push
 * notifications (Feature 5 — Notifications, PREMIUM tier). Configured
 * lazily so importing this module never throws when VAPID keys are unset —
 * push is simply a no-op and in-app notifications keep working (see
 * `lib/api-services/notifications.ts`, which never blocks on this).
 *
 * Generate a key pair with `npx web-push generate-vapid-keys` and set
 * `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (+ optionally
 * `VAPID_SUBJECT`) to enable push in an environment.
 */

let configured = false;

function ensureConfigured(): boolean {
  if (!env.VAPID_PRIVATE_KEY || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return false;
  }

  if (!configured) {
    webPush.setVapidDetails(
      env.VAPID_SUBJECT ?? "mailto:support@ronin.app",
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    configured = true;
  }

  return true;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushTarget {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Notification type (e.g. "BUDGET_PERIOD_ENDING") — the service worker's
   * `notificationclick` handler switches on this to resolve a destination
   * URL, mirroring components/notifications/notificationLink.ts. */
  type?: string;
  data?: Record<string, unknown>;
}

export type SendPushResult = "sent" | "skipped" | "stale";

/**
 * Sends a push notification to a single subscription.
 * - `"sent"` — delivered to the push service.
 * - `"skipped"` — VAPID isn't configured; not an error, just a no-op.
 * - `"stale"` — the push service reported the subscription is gone
 *   (404/410); the caller should delete the `PushSubscription` row.
 */
export async function sendPushNotification(
  target: PushTarget,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!ensureConfigured()) return "skipped";

  try {
    await webPush.sendNotification(
      { endpoint: target.endpoint, keys: target.keys },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: unknown }).statusCode
        : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return "stale";
    }

    console.error("Failed to send push notification", error);
    return "skipped";
  }
}
