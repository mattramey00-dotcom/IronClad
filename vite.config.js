import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/IronClad/",
  server: {
    port: 5173,
    open: true,
    // Allow the dev server to answer requests proxied through an HTTPS tunnel
    // (Cloudflare quick-tunnel / localtunnel) for phone testing. Vite otherwise
    // rejects requests whose Host header isn't localhost with "Blocked request".
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app"],
  },
});
