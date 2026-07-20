import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { loadTheme } from "./lib/storage.js";

// Apply the saved theme before first paint so there's no dark→light flash.
document.documentElement.dataset.theme = loadTheme();

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
