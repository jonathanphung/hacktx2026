import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: { proxy: { "/api/ai": "http://127.0.0.1:8787" } },
  preview: { proxy: { "/api/ai": "http://127.0.0.1:8787" } },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.2 MB
    rolldownOptions: {
      input: { main: "index.html", vision: "vision.html" },
    },
  },
});
