import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA is a single-page app; unknown paths fall back to index.html so the
// client router can handle /admin, /admin/new, /s/:token, etc.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // pdfjs worker is large; keep chunking reasonable.
    chunkSizeWarningLimit: 1200,
  },
});
