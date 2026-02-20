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
    if (isLoading || !hasResolvedInitialAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FFFBF7]">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to main site login, preserving state
        // Since we don't have a dedicated /login route, redirect to home
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Must be at least an admin or superadmin to access any admin route
    if (!isAdmin && !isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    // If superadmin is required, check for it specifically
    if (requireSuperAdmin && !isSuperAdmin) {
        // Redirect to main dashboard if they try to access restricted areas
        return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
};
