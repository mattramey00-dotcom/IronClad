// ============================================================
//  IRONCLAD — build identity
// ============================================================
//  These are replaced at build time by Vite's `define` (see vite.config.js).
//  The `typeof` guard keeps them from throwing if the app is ever run in an
//  environment where the define didn't apply (e.g. a bare unit test importing
//  this file) — there they just read as a harmless "dev" placeholder.

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "0";
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

// A short human label for the current build, e.g. "v1.0.0 · Aug 3, 2026".
export function buildLabel() {
  let when = "";
  try {
    if (BUILD_TIME) when = new Date(BUILD_TIME).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { /* leave blank */ }
  return `v${APP_VERSION}${when ? ` · ${when}` : ""}`;
}
