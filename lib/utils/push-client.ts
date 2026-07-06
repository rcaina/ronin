// ---------------------------------------------------------------------------
// Browser-only helpers for the web-push subscribe/unsubscribe flow (Feature 5
// — Notifications, PREMIUM tier). Nothing here is unit-testable business
// logic — it's thin wrapping over `navigator`/`window` — so it isn't covered
// by the notifications test suite; see `lib/utils/notifications.ts` for the
// pure trigger/dedupe logic that is.
// ---------------------------------------------------------------------------

/** Whether this browser can support web push at all. */
export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const isIosDevice = (): boolean =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

/** True when the app is running installed to the home screen (standalone
 * display mode), on any platform. */
export const isStandalonePwa = (): boolean => {
  if (typeof window === "undefined") return false;
  const displayModeStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS Safari's legacy (non-standard) standalone flag.
  const iosStandaloneFlag =
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandaloneFlag;
};

/**
 * True when push is unsupported specifically because this is iOS Safari
 * running in a regular browser tab rather than installed to the home
 * screen — iOS 16.4+ only supports web push from the installed PWA. The
 * settings UI shows a hint instead of a broken toggle in this case.
 */
export const needsIosHomeScreenInstall = (): boolean =>
  isIosDevice() && !isStandalonePwa();

/** Converts a URL-safe base64 VAPID public key into the Uint8Array shape
 * `PushManager.subscribe` expects for `applicationServerKey`. */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/** The current push subscription for this browser, if any (across app
 * reloads — the browser/service worker remembers it, not our server). */
export const getExistingPushSubscription =
  async (): Promise<PushSubscription | null> => {
    if (!isPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  };

/** Subscribes this browser to push via the already-registered service
 * worker (see public/sw.js), using the app's public VAPID key. */
export const subscribeBrowserToPush = async (
  vapidPublicKey: string,
): Promise<PushSubscription> => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
};
