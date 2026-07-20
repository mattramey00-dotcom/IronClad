import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { loadTheme } from "./lib/storage.js";

// Apply the saved theme before first paint so there's no dark→light flash.
document.documentElement.dataset.theme = loadTheme();

// When a lazily-loaded chunk can't be fetched — almost always because a newer
// build was deployed since this tab loaded, renaming the hashed files — reload
// once to pick up the fresh version instead of leaving a dead feature. Guarded
// so it can't loop.
window.addEventListener("vite:preloadError", () => {
  try {
    const last = Number(sessionStorage.getItem("chunkReloadAt")) || 0;
    if (Date.now() - last > 10000) {
      sessionStorage.setItem("chunkReloadAt", String(Date.now()));
      window.location.reload();
    }
  } catch { /* ignore */ }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker so the app is installable / works offline.
// Only runs in production builds where sw.js is served from the root.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* registration is optional; app still works without it */
    });
  });
}
