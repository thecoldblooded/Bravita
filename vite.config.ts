import { defineConfig, ViteDevServer, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import svgr from "vite-plugin-svgr";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage, ServerResponse } from "http";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Security guard: never allow captcha bypass in production builds
  if (mode === "production" && env.VITE_SKIP_CAPTCHA === "true") {
    throw new Error("Security misconfiguration: VITE_SKIP_CAPTCHA must not be true in production.");
  }

  const bffAuthTarget = String(env.VITE_BFF_AUTH_TARGET || "http://127.0.0.1:3901").trim();

  return {
    // Treat .lottie files as static assets
    assetsInclude: ["**/*.lottie"],
    server: {
      host: "0.0.0.0",
      port: 8080,
      proxy: {
        "/api/auth": {
          target: bffAuthTarget,
        },
      },
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
    esbuild: {
      // M-04 Security Fix: Strip console.* and debugger in production
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    build: {
      chunkSizeWarningLimit: 10000,
      // Improved code splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Core vendor libraries
            "vendor-core": ["react", "react-dom", "react-router-dom"],
            // UI libraries  
            "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select"],
            // Heavy dependencies
            "vendor-charts": ["recharts"],
            "vendor-animation": ["gsap", "framer-motion", "motion"],
            // External integrations
            "vendor-external": ["@supabase/supabase-js", "@hcaptcha/react-hcaptcha"],
          },
        },
        onwarn(warning, warn) {
          const warningMessage = typeof warning === "string" ? warning : warning.message;
          const warningCode = typeof warning === "string" ? "" : warning.code;
          const warningId = typeof warning === "string" ? "" : warning.id ?? "";

          if (warningCode === "EVAL" && warningId.includes("node_modules/lottie-web/build/player/lottie.js")) {
            return;
          }

          if (
            warningMessage.includes("dynamically imported by") &&
            warningMessage.includes("but also statically imported by")
          ) {
            return;
          }

          warn(warning);
        },
        input: {
          main: path.resolve(__dirname, "index.html"),
          admin: path.resolve(__dirname, "admin.html"),
        },
      },
    },
  };
});
