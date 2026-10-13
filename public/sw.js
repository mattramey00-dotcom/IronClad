// IRONCLAD service worker — simple offline cache.
// This is intentionally minimal; a designer/dev can swap in
// Workbox or vite-plugin-pwa for a production-grade strategy.

// One cache per build. The app registers ./sw.js?v=<build id>, so every deploy
// installs a fresh worker with its own cache, and activating it drops the last
// build's — old hashed files no longer pile up forever.
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const APP_PREFIX = "ironclad-app-";
const CACHE = APP_PREFIX + BUILD;
// Never deleted here: the exercise-GIF cache costs API requests to fill (see
// components/ExerciseGif.jsx), and it isn't tied to any one build.
const KEEP = new Set(["ironclad-exgif-v1"]);

// Pre-cache the page and the scripts/styles it loads, so the app still opens
// offline right after an update (before anything has been re-fetched).
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const res = await fetch("./", { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.clone().text();
        await cache.put("./", res);
        const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => new URL(m[1], self.location.href).href);
        await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
      } catch (e) {
        /* offline during install — the network-first fetch below fills it in */
      }
    })()
  );
});

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
      // Old builds' caches (and the pre-versioning "ironclad-vN" ones) go; the
      // current build's and the GIF cache stay.
      Promise.all(
        keys
          .filter((k) => k !== CACHE && !KEEP.has(k) && (k.startsWith(APP_PREFIX) || /^ironclad-v\d+$/.test(k)))
          .map((k) => caches.delete(k))
      )
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

// Network-first, falling back to cache when offline. Only the app's own files
// are cached — food lookups, AI calls and other sites go straight to the network
// (their results are already saved in your data where they matter).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
