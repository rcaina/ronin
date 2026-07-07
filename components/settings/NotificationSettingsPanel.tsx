"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ToggleRow from "./ToggleRow";
import UpgradeModal from "@/components/UpgradeModal";
import {
  NOTIFICATION_TRIGGERS,
  type NotificationTriggerKey,
} from "@/lib/types/notification-settings";
import {
  useNotificationSettingsOrDefault,
  useUpdateNotificationSettings,
} from "@/lib/data-hooks/notifications/useNotificationSettings";
import {
  useSubscribeToPush,
  useUnsubscribeFromPush,
} from "@/lib/data-hooks/notifications/usePushSubscription";
import {
  getExistingPushSubscription,
  isPushSupported,
  needsIosHomeScreenInstall,
} from "@/lib/utils/push-client";
import { UpgradeRequiredError } from "@/lib/data-hooks/services/http";

/**
 * Per-user notification preferences — the "Notifications" settings tab.
 * Only rendered when the account-wide `notifications` feature toggle is on
 * (see the tab visibility check in src/app/settings/page.tsx) — that toggle
 * is the master switch; these are per-trigger refinements underneath it.
 */
export default function NotificationSettingsPanel() {
  const { data: settings, isLoading } = useNotificationSettingsOrDefault();
  const updateSettings = useUpdateNotificationSettings();
  const subscribeMutation = useSubscribeToPush();
  const unsubscribeMutation = useUnsubscribeFromPush();

  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(true);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  // Feature-detection and the current subscription state only exist in the
  // browser — read them after mount so this never runs during SSR.
  useEffect(() => {
    setPushSupported(isPushSupported());
    setNeedsIosInstall(needsIosHomeScreenInstall());
    void getExistingPushSubscription().then((subscription) =>
      setPushSubscribed(subscription !== null),
    );
  }, []);

  const handleToggleTrigger = async (key: NotificationTriggerKey) => {
    const next = !settings[key];
    try {
      await updateSettings.mutateAsync({ [key]: next });
      toast.success(
        next ? "Notification turned on" : "Notification turned off",
      );
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update notification settings. Please try again.",
      );
    }
  };

  const handleTogglePush = async () => {
    if (pushSubscribed) {
      try {
        await unsubscribeMutation.mutateAsync();
        setPushSubscribed(false);
        toast.success("Push notifications turned off");
      } catch (error) {
        console.error("Failed to unsubscribe from push:", error);
        toast.error("Failed to turn off push notifications. Please try again.");
      }
      return;
    }

    try {
      await subscribeMutation.mutateAsync();
      setPushSubscribed(true);
      toast.success("Push notifications turned on");
    } catch (error) {
      if (error instanceof UpgradeRequiredError) {
        setUpgradeReason(error.message);
        return;
      }
      console.error("Failed to subscribe to push:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to turn on push notifications. Please try again.",
      );
    }
  };

  const pushMutationPending =
    subscribeMutation.isPending || unsubscribeMutation.isPending;

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="card-surface p-5 sm:p-6">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Alerts
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Choose which events notify you in-app.
          </p>

          <div className="mt-4 divide-y divide-gray-200/70">
            {isLoading
              ? NOTIFICATION_TRIGGERS.map((trigger) => (
                  <div
                    key={trigger.key}
                    className="h-14 animate-pulse py-3 first:pt-0 last:pb-0"
                  >
                    <div className="h-full rounded-xl bg-surface-muted" />
                  </div>
                ))
              : NOTIFICATION_TRIGGERS.map((trigger) => (
                  <ToggleRow
                    key={trigger.key}
                    label={trigger.label}
                    description={trigger.description}
                    checked={settings[trigger.key]}
                    disabled={updateSettings.isPending}
                    onChange={() => void handleToggleTrigger(trigger.key)}
                  />
                ))}
          </div>
        </div>

        <div className="card-surface p-5 sm:p-6">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">
            Push notifications
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Get alerted outside the app, even when Ronin isn&apos;t open. A
            Premium feature.
          </p>

          {!pushSupported ? (
            <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm text-gray-600">
              This browser doesn&apos;t support push notifications.
            </p>
          ) : needsIosInstall ? (
            <p className="mt-4 rounded-xl bg-secondary-50 p-3 text-sm text-secondary-800">
              On iPhone/iPad, add Ronin to your home screen first (Share → Add
              to Home Screen) — iOS only allows push notifications from an
              installed app.
            </p>
          ) : (
            <div className="mt-4">
              <ToggleRow
                label="Push notifications"
                description="Mirror your in-app alerts as push notifications on this device."
                checked={pushSubscribed === true}
                disabled={pushSubscribed === null || pushMutationPending}
                onChange={() => void handleTogglePush()}
              />
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeReason !== null}
        onClose={() => setUpgradeReason(null)}
        reason={upgradeReason ?? undefined}
      />
    </>
  );
}
