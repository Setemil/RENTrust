import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin API calls in dev, so the browser never needs CORS. Start the server on :5050.
    proxy: { "/api": "http://localhost:5050" },
  },
});
