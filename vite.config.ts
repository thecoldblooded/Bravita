import { defineConfig, ViteDevServer, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import svgr from "vite-plugin-svgr";
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
        "/api/visitor-counter": {
          target: bffAuthTarget,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      proxy: {
        "/api/auth": {
          target: bffAuthTarget,
        },
        "/api/visitor-counter": {
          target: bffAuthTarget,
        },
      },
    },
    plugins: [
      ViteImageOptimizer({
        test: /\.(jpe?g|png|tiff|webp|svg|avif)$/i,
        exclude: /(bravita\.webp|\.gif)$/i,
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
          quality: 80,
        },
        avif: {
          quality: 70,
        },
      }),
      tailwindcss(),
      react(),
      svgr(),
      // Custom plugin to handle route-specific HTML entry points in dev
      {
        name: "route-specific-html-fallbacks",
        configureServer(server: ViteDevServer) {
          server.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
            if (!req.url) {
              next();
              return;
            }

            if (req.url === "/admin" || req.url.startsWith("/admin/")) {
              req.url = "/admin.html";
              next();
              return;
            }

            if (req.url === "/gizlilik-politikasi" || req.url === "/gizlilik-politikasi/") {
              req.url = "/gizlilik-politikasi/index.html";
              next();
              return;
            }

            if (req.url === "/kullanim-kosullari" || req.url === "/kullanim-kosullari/") {
              req.url = "/kullanim-kosullari/index.html";
              next();
              return;
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
      chunkSizeWarningLimit: 800,
      // Improved code splitting for better caching
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("react-router-dom") ||
                id.includes("react-helmet-async") ||
                id.includes("scheduler")
              ) {
                return "vendor-react";
              }
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }
              if (id.includes("framer-motion") || id.includes("gsap")) {
                return "vendor-animation";
              }
              if (id.includes("three") || id.includes("vanta")) {
                return "vendor-graphics";
              }
              if (id.includes("recharts") || id.includes("d3")) {
                return "vendor-charts";
              }
              if (id.includes("lucide-react")) {
                return "vendor-icons";
              }
              if (
                id.includes("@radix-ui") ||
                id.includes("class-variance-authority") ||
                id.includes("tailwind-merge") ||
                id.includes("clsx")
              ) {
                return "vendor-ui-core";
              }
              return "vendor-others";
            }
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
          privacy: path.resolve(__dirname, "gizlilik-politikasi/index.html"),
          terms: path.resolve(__dirname, "kullanim-kosullari/index.html"),
        },
      },
    },
  };
});
