import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Loader from "@/components/ui/Loader";

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

export const ProtectedAdminRoute = ({ children, requireSuperAdmin = false }: ProtectedAdminRouteProps) => {
    const { isAuthenticated, isAdmin, isSuperAdmin, isLoading, hasResolvedInitialAuth } = useAuth();
    const location = useLocation();
    const debugState = {
        path: location.pathname,
        href: typeof window !== "undefined" ? window.location.href : "",
        isLoading,
        hasResolvedInitialAuth,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        requireSuperAdmin,
    };

    if (isLoading || !hasResolvedInitialAuth) {
        console.info("[ProtectedAdminRoute] loading", debugState);
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FFFBF7]">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        console.warn("[ProtectedAdminRoute] redirect unauthenticated -> /", debugState);
        // Redirect to main site login, preserving state
        // Since we don't have a dedicated /login route, redirect to home
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Must be at least an admin or superadmin to access any admin route
    if (!isAdmin && !isSuperAdmin) {
        console.warn("[ProtectedAdminRoute] redirect non-admin -> /", debugState);
        return <Navigate to="/" replace />;
    }

    // If superadmin is required, check for it specifically
    if (requireSuperAdmin && !isSuperAdmin) {
        console.warn("[ProtectedAdminRoute] redirect non-superadmin -> /admin", debugState);
        // Redirect to main dashboard if they try to access restricted areas
        return <Navigate to="/admin" replace />;
    }

    console.info("[ProtectedAdminRoute] allow", debugState);
    return <>{children}</>;
};
