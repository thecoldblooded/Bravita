import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { HelmetProvider } from "react-helmet-async";

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

const markAppReady = () => {
  const documentRoot = document.documentElement;
  const seoShell = document.getElementById("seo-shell");

  seoShell?.remove();
  documentRoot.classList.remove("seo-shell-overlay");
  documentRoot.classList.add("app-ready");
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

const rootElement = document.getElementById("root");

createRoot(rootElement!).render(
  <HelmetProvider>
    <AuthProvider>
      <CartProvider>
        <App onReady={scheduleSeoShellDismiss} />
      </CartProvider>
    </AuthProvider>
  </HelmetProvider>
);
