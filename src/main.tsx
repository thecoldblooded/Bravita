import { createRoot } from "react-dom/client";
import { setWasmUrl } from "@lottiefiles/dotlottie-react";
import wasmUrl from "@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { HelmetProvider } from "react-helmet-async";

setWasmUrl(wasmUrl);

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
  document.documentElement.classList.add("app-ready");

  const seoShell = document.getElementById("seo-shell");
  if (!seoShell) return;

  seoShell.setAttribute("aria-hidden", "true");

  const removalDelay = document.documentElement.classList.contains("seo-shell-overlay") ? 760 : 0;
  window.setTimeout(() => {
    if (seoShell.isConnected) {
      seoShell.remove();
    }
  }, removalDelay);
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

scheduleSeoShellDismiss();
