import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";

export function IncompleteProfileBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, isLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show on complete-profile page
    if (location.pathname === "/complete-profile") {
      setIsVisible(false);
      return;
    }

    // Show banner if:
    // 1. User is authenticated (has session)
    // 2. Profile is not complete
    // 3. Not a stub user (transient placeholder during load)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStub = (user as any)?.isStub === true;

    // Show for any authenticated user with incomplete profile
    if (!isLoading && session?.user && user && !user.profile_complete && !isStub) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isLoading, session?.user, user, user?.profile_complete, location.pathname]);

  if (!isVisible) {
    return null;
  }

  const handleNavigate = () => {
    navigate("/complete-profile");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 overflow-hidden bg-linear-to-br from-orange-500/95 via-red-500/95 to-pink-500/95 backdrop-blur-md text-white shadow-2xl rounded-3xl border border-white/20">
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm pointer-events-none"></div>
      <div className="relative flex items-center gap-4 px-6 py-4 z-10">
        <div className="shrink-0">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse pointer-events-none"></div>
            <AlertCircle className="relative h-8 w-8 text-white drop-shadow-lg animate-bounce" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-bold leading-relaxed">
            <span className="inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {t("auth.profile_incomplete_warning")}
            </span>
          </p>
          <button
            onClick={handleNavigate}
            className="mt-2 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl border border-white/40 hover:border-white/60 relative z-20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t("auth.complete_your_profile")}
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Animated background pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>
    </div>
  );
}
