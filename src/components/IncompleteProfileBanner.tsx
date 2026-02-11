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
    <div className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 w-[90%] md:max-w-2xl z-50 overflow-hidden bg-linear-to-r from-orange-600/95 via-red-600/95 to-orange-600/95 backdrop-blur-xl text-white shadow-[0_20px_50px_rgba(249,115,22,0.3)] rounded-3xl border border-white/30 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm pointer-events-none"></div>
      <div className="relative flex flex-col md:flex-row items-center gap-4 px-6 py-4 z-10">
        <div className="shrink-0 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full animate-pulse pointer-events-none"></div>
            <div className="relative bg-white/20 p-2 rounded-2xl backdrop-blur-md border border-white/40">
              <AlertCircle className="h-6 w-6 text-white drop-shadow-lg animate-[bounce_2s_infinite]" />
            </div>
          </div>
          <p className="text-base md:text-lg font-black tracking-tight leading-relaxed">
            {t("auth.profile_incomplete_warning")}
          </p>
        </div>

        <div className="flex-1 flex justify-center md:justify-end w-full">
          <button
            onClick={handleNavigate}
            className="group relative overflow-hidden inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-2.5 rounded-2xl font-black text-sm shadow-[0_10px_20px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 border border-white/10"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>

            <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="relative z-10">{t("auth.complete_your_profile")}</span>
            <svg className="w-4 h-4 animate-pulse group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
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
