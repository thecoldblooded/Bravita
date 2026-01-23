import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import "./i18n/config";
import { AuthProvider } from "./contexts/AuthContext";

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
  <AuthProvider>
    <App />
  </AuthProvider>
);
