import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@shared": path.resolve(__dirname, "../api/src/shared"), "@": path.resolve(__dirname, "src") },
  },
  server: {
    fs: { allow: [path.resolve(__dirname, "..")] },
    proxy: { "/api": "http://localhost:7071" },
  },
  build: { sourcemap: false },
});
