import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import Index from "./pages/Index";
import "@/i18n/config"; // Ensure i18n is initialized
import UnderConstruction from "@/components/UnderConstruction";
import { initializeConsentAwareAnalytics } from "@/lib/performance/loadContentSquare";
import periodicAlpacaGif from "@/assets/alpaca.gif";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import WelcomeAnimation from "@/components/WelcomeAnimation";

// Admin pages
const NotFound = lazy(() => import("./pages/NotFound"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ThreeDSRedirect = lazy(() => import("./pages/ThreeDSRedirect"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const PeriodicGif = lazy(() => import("@/components/PeriodicGif"));
const PromotionMarquee = lazy(() => import("@/components/PromotionMarquee"));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/AdminOrderDetail"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/AdminPromoCodes"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminEmails = lazy(() => import("@/pages/admin/AdminEmails"));
const EmailPreview = lazy(() => import("./pages/EmailPreview"));

/**
 * 🚧 MAINTENANCE MODE FLAG
 * 
 * Set to `true` to show "Under Construction" page to all visitors
 * Set to `false` to show the normal website
 * 
 * TEMPORARY: Remove this when the site is ready for production
 */
const MAINTENANCE_MODE = false;

const PERIODIC_IMAGE_URL = periodicAlpacaGif;

const queryClient = new QueryClient();

import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Loader from "@/components/ui/Loader";
import { AdminThemeProvider } from "@/contexts/AdminThemeContext";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";

const RouteFallback = () => (
  <div className="min-h-[35vh] flex items-center justify-center">
    <Loader />
  </div>
);

// Separate component to use useLocation inside BrowserRouter
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLandingRoute = location.pathname === '/';
  const [showDeferredEnhancements, setShowDeferredEnhancements] = useState(false);

  useEffect(() => {
    let idleHandle: number | null = null;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const activateDeferredEnhancements = () => setShowDeferredEnhancements(true);

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(activateDeferredEnhancements, { timeout: 3000 });
    } else {
      fallbackTimeout = setTimeout(activateDeferredEnhancements, 3000);
    }

    return () => {
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
    };
  }, []);

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Main site routes */}
          <Route path="/" element={<Index />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/3d-redirect" element={<ThreeDSRedirect />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/email-preview" element={<EmailPreview />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrders /></ProtectedAdminRoute>} />
          <Route path="/admin/orders/:orderId" element={<ProtectedAdminRoute><AdminOrderDetail /></ProtectedAdminRoute>} />
          <Route path="/admin/products" element={<ProtectedAdminRoute><AdminProducts /></ProtectedAdminRoute>} />
          <Route path="/admin/promotions" element={<ProtectedAdminRoute><AdminPromoCodes /></ProtectedAdminRoute>} />
          <Route path="/admin/support" element={<ProtectedAdminRoute><AdminSupport /></ProtectedAdminRoute>} />
          <Route path="/admin/emails" element={<ProtectedAdminRoute requireSuperAdmin={true}><AdminEmails /></ProtectedAdminRoute>} />
          <Route path="/admin/admins" element={<ProtectedAdminRoute requireSuperAdmin={true}><AdminUsers /></ProtectedAdminRoute>} />
          <Route path="/admin/logs" element={<ProtectedAdminRoute requireSuperAdmin={true}><AdminAuditLogs /></ProtectedAdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Non-admin route extras */}
      {!isAdminRoute && (
        <Suspense fallback={null}>
          {isLandingRoute ? (
            <PeriodicGif
              gifSrc={PERIODIC_IMAGE_URL}
              intervalMs={60000}
              initialDelayMs={0}
              alt="Alpaca animation"
            />
          ) : null}
          {showDeferredEnhancements && isLandingRoute ? (
            <>
              <PromotionMarquee />
              <div className="promo-marquee-spacer h-12 md:h-14" aria-hidden="true" />
            </>
          ) : null}
          <CookieConsent />
        </Suspense>
      )}
    </>
  );
};

const App = () => {
  const { isSplashScreenActive, isPasswordRecovery, session } = useAuth();

  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return false;

    // Check if intentional flag was set explicitly by SignupForm.tsx
    const isNewSignupIntent = localStorage.getItem("bravita_new_signup") === 'true';

    // Fallback: Check traditional URL parameters
    const hashType = window.location.hash.includes("type=signup");
    const searchType = window.location.search.includes("type=signup");

    // Clear the intentional flag to prevent loop
    if (isNewSignupIntent) {
      localStorage.removeItem("bravita_new_signup");
    }

    return isNewSignupIntent || hashType || searchType;
  });

  useEffect(() => {
    if (showWelcome) {
      localStorage.setItem("bravita_has_seen_welcome", "true");
    }
  }, [showWelcome]);

  // Backup trigger logic for PKCE auth flows where URL params might be stripped cleanly 
  // before React renders or across cross-device signups via email links.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (session?.user?.created_at && !showWelcome) {
      const createdAt = new Date(session.user.created_at).getTime();
      const now = new Date().getTime();
      const minutesSinceCreation = (now - createdAt) / (1000 * 60);

      const hasSeenWelcome = localStorage.getItem("bravita_has_seen_welcome") === "true";

      // Show if account created within last 5 minutes and hasn't seen the intro yet
      if (minutesSinceCreation < 5 && !hasSeenWelcome) {
        localStorage.setItem("bravita_has_seen_welcome", "true");
        // Defer state update to next tick to avoid React warnings about rendering in effect synchronously
        timeoutId = setTimeout(() => {
          setShowWelcome(true);
        }, 10);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session?.user?.created_at, showWelcome]);

  useEffect(() => {
    const teardownAnalytics = initializeConsentAwareAnalytics();
    return teardownAnalytics;
  }, []);

  // 🚧 Maintenance mode - show under construction page
  if (MAINTENANCE_MODE) {
    return <UnderConstruction />;
  }

  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AdminThemeProvider>
              <Toaster />
              <Sonner />

              {showWelcome ? (
                <WelcomeAnimation onComplete={() => setShowWelcome(false)} />
              ) : isSplashScreenActive ? (
                <div className="fixed inset-0 bg-[#FFFBF7] z-50 flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
                    <ImageWithFallback />
                  </div>
                  <m.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-orange-900/40 font-medium text-sm tracking-widest uppercase"
                  >
                    Yükleniyor
                  </m.p>
                </div>
              ) : isPasswordRecovery ? (
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="*" element={<UpdatePassword />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              ) : (
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppContent />
                </BrowserRouter>
              )}
            </AdminThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LazyMotion>
    </ErrorBoundary>
  );
};

export default App;
