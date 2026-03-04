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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </HelmetProvider>
);
