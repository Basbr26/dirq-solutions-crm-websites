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
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: 'hidden',
    // Force new chunk hashes after workflow removal
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Generate deterministic but fresh chunk names
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Separate React core (most critical)
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core';
            }
            // React ecosystem
            if (id.includes('react-router') || id.includes('react-hook-form') || id.includes('react-error-boundary')) {
              return 'react-ecosystem';
            }
            // Calendar libraries
            if (id.includes('react-big-calendar') || id.includes('date-fns')) {
              return 'calendar';
            }
            // All other vendor code
            return 'vendor';
          }
        },
      },
    },
  },
}));
