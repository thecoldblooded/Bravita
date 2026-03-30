import { createRoot } from "react-dom/client";
import heroShellLcpImageSrc from "@/assets/bravita-bottle1.webp";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { HelmetProvider } from "react-helmet-async";

const HERO_SHELL_LCP_IMAGE_SRC = heroShellLcpImageSrc;
const SEO_LOADER_GIF_SRC = "/bravita.gif";
const MIN_SEO_LOADER_VISIBLE_MS = 2200;

const isAuthCallbackRequest = () => {
  const hash = window.location.hash;
  const search = window.location.search;

  return (
    hash.includes("access_token=") ||
    hash.includes("type=signup") ||
    hash.includes("type=recovery") ||
    search.includes("code=") ||
    search.includes("type=signup") ||
    search.includes("type=recovery")
  );
};

// Prevent zoom on Safari/iOS
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});
document.addEventListener('gesturechange', function (e) {
  e.preventDefault();
});
document.addEventListener('gestureend', function (e) {
  e.preventDefault();
});

const rootElement = document.getElementById("root");

createRoot(rootElement!).render(
  <HelmetProvider>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </HelmetProvider>
);

const markAppReady = () => {
  const documentRoot = document.documentElement;
  const seoShell = document.getElementById("seo-shell");

  documentRoot.classList.remove("seo-shell-pending", "seo-shell-overlay");

  if (seoShell) {
    seoShell.setAttribute("aria-hidden", "true");
    seoShell.style.opacity = "0";
    seoShell.style.visibility = "hidden";
    seoShell.style.display = "none";
    seoShell.remove();
  }

  documentRoot.classList.add("app-ready");
};

const waitForMinimumLoaderExposure = async () => {
  const startedAtRaw = document.documentElement.dataset.seoShellStartedAt;
  const startedAt = startedAtRaw ? Number.parseInt(startedAtRaw, 10) : Date.now();
  const elapsed = Date.now() - startedAt;
  const remaining = MIN_SEO_LOADER_VISIBLE_MS - elapsed;

  if (!Number.isFinite(remaining) || remaining <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, remaining);
  });
};

const waitForFontReadiness = async () => {
  if (!("fonts" in document)) {
    return;
  }

  try {
    await Promise.race([
      document.fonts.ready.then(() => undefined),
      new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, 1500);
      }),
    ]);
  } catch {
    // no-op
  }
};

const waitForImageReadiness = (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeoutId = globalThis.setTimeout(finish, 1500);

    image.onload = () => {
      globalThis.clearTimeout(timeoutId);
      finish();
    };

    image.onerror = () => {
      globalThis.clearTimeout(timeoutId);
      finish();
    };

    image.src = src;

    if (image.complete) {
      globalThis.clearTimeout(timeoutId);
      finish();
      return;
    }

    if (typeof image.decode === "function") {
      image.decode().then(() => {
        globalThis.clearTimeout(timeoutId);
        finish();
      }).catch(() => {
        // onload/onerror/timeout will resolve
      });
    }
  });

const waitForVisualReadiness = async () => {
  const tasks = [
    waitForFontReadiness(),
    waitForImageReadiness(HERO_SHELL_LCP_IMAGE_SRC),
  ];

  if (!isAuthCallbackRequest()) {
    tasks.push(waitForImageReadiness(SEO_LOADER_GIF_SRC));
  }

  await Promise.all(tasks);
};

const scheduleSeoShellDismiss = () => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(markAppReady);
    });
    return;
  }

  globalThis.setTimeout(markAppReady, 120);
};

const revealAppWhenReady = async () => {
  if (isAuthCallbackRequest()) {
    markAppReady();
    return;
  }

  await Promise.all([
    waitForVisualReadiness(),
    waitForMinimumLoaderExposure(),
  ]);

  scheduleSeoShellDismiss();
};

void revealAppWhenReady();
