const CACHE_NAME = "ronin-static-v1";

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline | Ronin</title>
    <style>
      body {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f7f7f5;
        color: #0e0e10;
        font-family: system-ui, sans-serif;
        text-align: center;
      }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #6b7280; margin: 0; }
    </style>
  </head>
  <body>
    <div>
      <h1>You're offline</h1>
      <p>Ronin needs a connection. Try again once you're back online.</p>
    </div>
  </body>
</html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages always go to the network so data is never stale; the cache is only
  // an offline fallback for navigations.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html" },
          }),
      ),
    );
    return;
  }

  // Build assets are content-hashed and icons are effectively immutable, so
  // cache-first is safe for them.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|ico|jpg)$/.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }),
  );
});

// ---------------------------------------------------------------------------
// Web push (Feature 5 — Notifications, PREMIUM tier). The payload shape
// (`{ title, body, type, data }`) is built by lib/api-services/notifications.ts
// via src/server/push.ts — see those for what `type`/`data` hold per trigger.
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = payload.title || "Ronin";
  const options = {
    body: payload.body || "",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    data: { type: payload.type, ...payload.data },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Resolves the page a push notification should open. Mirrors
// components/notifications/notificationLink.ts — kept in sync manually,
// since a plain (unbundled) service worker can't import the app's TS.
function resolveNotificationUrl(data) {
  if (!data) return "/";

  switch (data.type) {
    case "CATEGORY_OVER_THRESHOLD":
      return data.budgetId ? `/budgets/${data.budgetId}/categories` : "/";
    case "BUDGET_PERIOD_ENDING":
      return data.budgetId ? `/budgets/${data.budgetId}` : "/";
    case "RECURRING_POSTED":
      return "/transactions/recurring";
    default:
      return "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = resolveNotificationUrl(event.notification.data);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            new URL(client.url).origin === self.location.origin &&
            "focus" in client
          ) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
