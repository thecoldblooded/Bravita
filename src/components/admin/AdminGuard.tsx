import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Loader from "@/components/ui/Loader";
import { useEffect, useState } from "react";

interface AdminGuardProps {
    children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
    const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
    const [showTimeout, setShowTimeout] = useState(false);

    // Safety timeout - if still loading after 3 seconds, show error
    useEffect(() => {
        if (isLoading && !user) {
            const timer = setTimeout(() => {
                setShowTimeout(true);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [isLoading, user]);

    // Show loader while initial auth is loading
    if (isLoading && !user && !showTimeout) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF7]">
                <Loader />
                <p className="text-gray-500 mt-4 animate-pulse">Yönetici kimliği doğrulanıyor...</p>
            </div>
        );
    }

    // Secure Check: Only proceed if authenticated AND definitively marked as admin
    if (!isAuthenticated || !isAdmin) {
        // If we are still loading verify status, stay in loading above.
        // If loading finished and not admin, show Access Denied.

        if (showTimeout && !user) {
            console.error("AdminGuard: Verification timed out.");
        }

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF7] p-4 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h1>
                <p className="text-gray-500 mb-6 max-w-md">
                    {showTimeout
                        ? "Kimlik doğrulama sunucusuna ulaşılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
                        : "Bu sayfaya erişmek için yönetici yetkisine sahip olmanız gerekmektedir."}
                </p>
                <div className="flex gap-3">
                    <button
                        className="bg-orange-600 text-white px-6 py-2 rounded-xl hover:bg-orange-700 font-medium transition-all shadow-lg shadow-orange-200"
                        onClick={() => window.location.href = "/"}
                    >
                        Ana Sayfaya Dön
                    </button>
                    {showTimeout && (
                        <button
                            className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            Tekrar Dene
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

