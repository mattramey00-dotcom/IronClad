// IRONCLAD service worker — simple offline cache.
// This is intentionally minimal; a designer/dev can swap in
// Workbox or vite-plugin-pwa for a production-grade strategy.

const CACHE = "ironclad-v5";

// NOTE: install no longer calls skipWaiting(). When a new worker is deployed it
// installs and then WAITS, so the app can show an "update available" prompt and
// only take over when the user taps Reload (which posts SKIP_WAITING below).
// First-ever install still activates immediately — there's no old worker to wait
// for — so a fresh visitor isn't blocked.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Notification taps. A rest-timer notification just focuses the app. Any tap on
// the protein reminder — its "Add a meal" button or the reminder itself — opens
// the add-a-meal flow directly, so there's no landing on Fuel and hunting for
// the button. The app gets the intent by postMessage when it's already open, or
// as a ?n= param when it has to be launched.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const isProtein = event.notification.tag === "ironclad-protein" || event.notification.data?.kind === "protein";
  const intent = isProtein ? "add-meal" : null; // null = just focus (e.g. the rest timer)
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { if (intent) c.postMessage({ type: "notif", intent }); return c.focus(); }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(intent === "add-meal" ? "./?n=addmeal" : "./");
      }
      return undefined;
    })
  );
});

// Network-first, falling back to cache when offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
