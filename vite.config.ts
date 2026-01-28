import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Polyfill Buffer for pdf-lib in browser
    'global': 'globalThis',
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: 'hidden',
    // Let Vite handle chunking automatically to avoid race conditions
    // Manual chunks can cause React to load after libraries that depend on it
  },
}));
