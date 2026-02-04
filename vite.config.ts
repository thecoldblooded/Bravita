import { defineConfig, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import svgr from "vite-plugin-svgr";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Treat .lottie files as static assets
  assetsInclude: ["**/*.lottie"],
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
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

