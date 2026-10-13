import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { loadTheme } from "./lib/storage.js";
import { registerSW } from "./lib/swUpdate.js";

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

// Register the service worker (installable / offline) and wire up update
// detection so the app can offer a one-tap reload when a new build is deployed.
registerSW();

// Ask the browser to keep this app's storage (logs, meals, photos) rather than
// treat it as clearable when the phone runs low on space. Installed home-screen
// apps are usually granted this silently; elsewhere it's a quiet no-op.
try {
  navigator.storage?.persisted?.().then((already) => { if (!already) navigator.storage.persist?.(); });
} catch { /* unsupported */ }
