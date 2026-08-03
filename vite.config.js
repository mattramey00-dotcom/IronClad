import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/IronClad/",
  // Baked into the bundle at build time. __BUILD_ID__ changes every build, so the
  // service worker registration URL (./sw.js?v=<id>) changes each deploy — that's
  // what lets an installed app notice a new version and offer to reload.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
    __BUILD_ID__: JSON.stringify(String(Date.now())),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 5173,
    open: true,
    // Allow the dev server to answer requests proxied through an HTTPS tunnel
    // (Cloudflare quick-tunnel / localtunnel) for phone testing. Vite otherwise
    // rejects requests whose Host header isn't localhost with "Blocked request".
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app"],
  },
});
