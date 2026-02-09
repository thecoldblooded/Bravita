import { defineConfig, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import svgr from "vite-plugin-svgr";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage, ServerResponse } from "http";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Treat .lottie files as static assets
  assetsInclude: ["**/*.lottie"],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      exclude: undefined,
      include: undefined,
      includePublic: true,
      logStats: true,
      ansiColors: true,
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                cleanupIds: false,
                removeViewBox: false,
              },
            },
          },
          'sortAttrs',
          {
            name: 'addAttributesToSVGElement',
            params: {
              attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
            },
          },
        ],
      },
      png: {
        quality: 85,
      },
      jpeg: {
        quality: 85,
      },
      jpg: {
        quality: 85,
      },
      webp: {
        lossless: true,
      },
      avif: {
        lossless: true,
      },
    }),
    tailwindcss(),
    react(),
    svgr(),
    mode === "development" && componentTagger(),
    // Custom plugin to handle admin routes in dev
    {
      name: "admin-spa-fallback",
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
          // If accessing /admin or /admin/* routes, serve admin.html
          if (req.url && (req.url === "/admin" || req.url.startsWith("/admin/"))) {
            req.url = "/admin.html";
          }
          next();
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        admin: path.resolve(__dirname, "admin.html"),
      },
    },
  },
}));

