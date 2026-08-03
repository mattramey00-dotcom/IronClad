// ============================================================
//  IRONCLAD — service worker update detection
// ============================================================
//  The app is an installed PWA with a cache-first-ish service worker, so a copy
//  that's already open keeps running the build it started with until it's told to
//  update. This module registers the worker, watches for a newer one to finish
//  installing, and lets the UI offer a one-tap reload.
//
//  Two design choices make it reliable:
//    · The worker is registered as `sw.js?v=<BUILD_ID>`. BUILD_ID is baked in at
//      build time, so the registration URL changes on every deploy — that's what
//      makes the browser notice a new version even when only the app chunks (not
//      sw.js itself) changed.
//    · We only reload on `controllerchange` AFTER the user taps Reload. Without
//      that guard, the very first install (which claims the page) would trigger a
//      spurious reload on a brand-new visitor.
// ============================================================

import { BUILD_ID } from "./version.js";

let waitingWorker = null;   // the installed-but-waiting worker, once one exists
let listener = null;        // the UI's "an update is ready" callback
let userTriggered = false;  // set true only when the user asks to update
let refreshing = false;     // guards against a double reload

// The UI subscribes to be told when an update becomes available. Returns an
// unsubscribe. If an update is already waiting when it subscribes, it's told at
// once.
export function onUpdateReady(cb) {
  listener = cb;
  if (waitingWorker) cb();
  return () => { if (listener === cb) listener = null; };
}

// Tapping "Reload" lands here: tell the waiting worker to take over. The actual
// page reload happens on the controllerchange that follows.
export function applyUpdate() {
  if (!waitingWorker) return;
  userTriggered = true;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

function announce(worker) {
  waitingWorker = worker;
  if (listener) listener();
}

export function registerSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Only a user-initiated update should reload the page; the first-ever
    // controller acquisition (new visitor) must not.
    if (!userTriggered || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register(`./sw.js?v=${BUILD_ID}`);
    } catch {
      return; // registration is optional; the app works without it
    }

    // A worker may already be waiting from a previous visit.
    if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting);

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // "installed" + an existing controller == an update (not a first install).
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          announce(reg.waiting || installing);
        }
      });
    });

    // Ask the browser to re-check for a new worker periodically and whenever the
    // app is brought back to the foreground, so a long-open session still notices.
    const check = () => reg.update().catch(() => {});
    setInterval(check, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  });
}
