import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /hacktx2026/.
  base: command === "build" ? "/hacktx2026/" : "/",
  build: {
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.2 MB
    rolldownOptions: {
      input: { main: "index.html", vision: "vision.html" },
    },
  },
}));
