import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to Flask, so the frontend uses same-origin
// relative URLs and never needs a CORS preflight during development.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
