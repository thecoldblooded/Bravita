import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import AdminApp from "./AdminApp.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HelmetProvider>
            <AuthProvider>
                <AdminApp />
            </AuthProvider>
        </HelmetProvider>
    </StrictMode>
);
