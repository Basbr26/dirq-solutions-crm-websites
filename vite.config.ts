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
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React MUST be in its own chunk and loaded FIRST
            if (id.includes('react/') && !id.includes('react-router') && !id.includes('react-dom')) {
              return 'react';
            }
            // React-DOM in separate chunk (depends on react)
            if (id.includes('react-dom/')) {
              return 'react-dom';
            }
            // All other React ecosystem libraries
            if (id.includes('react-') || id.includes('react')) {
              return 'react-libs';
            }
            // Calendar
            if (id.includes('react-big-calendar') || id.includes('date-fns')) {
              return 'calendar';
            }
            // Everything else
            return 'vendor';
          }
        },
      },
    },
  },
}));
