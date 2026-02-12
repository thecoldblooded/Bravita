import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Index from "./pages/Index";
import "@/i18n/config"; // Ensure i18n is initialized
import UnderConstruction from "@/components/UnderConstruction";
import { initializeConsentAwareAnalytics } from "@/lib/performance/loadContentSquare";
import bravitaGif from "@/assets/bravita.gif";
import periodicAlpacaGif from "@/assets/alpaca.gif";
import periodicAlpacaVideo from "@/assets/optimized/alpaca-optimized.mp4";

// Admin pages
const NotFound = lazy(() => import("./pages/NotFound"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
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

const RouteFallback = () => (
  <div className="min-h-[35vh] flex items-center justify-center">
    <Loader />
  </div>
);

// Separate component to use useLocation inside BrowserRouter
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
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
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/promotions" element={<AdminPromoCodes />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/admins" element={<AdminUsers />} />
          <Route path="/admin/logs" element={<AdminAuditLogs />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Only show these on non-admin routes */}
      {!isAdminRoute && (
        <Suspense fallback={null}>
          <PeriodicGif
            gifSrc={PERIODIC_IMAGE_URL}
            videoSrc={periodicAlpacaVideo}
            intervalMs={60000}
            initialDelayMs={0}
            alt="Alpaca animation"
          />
          {showDeferredEnhancements ? (
            <>
              <PromotionMarquee />
              <div className="h-12 md:h-14" aria-hidden="true" />
            </>
          ) : null}
          <CookieConsent />
        </Suspense>
      )}
    </>
  );
};

const App = () => {
  const { isSplashScreenActive, isPasswordRecovery } = useAuth();

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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AdminThemeProvider>
            <Toaster />
            <Sonner />

            {isSplashScreenActive ? (
              <div className="fixed inset-0 bg-[#FFFBF7] z-50 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
                  <img 
                    src={bravitaGif} 
                    alt="Loading" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback if GIF doesn't load
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="w-32 h-32 bg-orange-100 rounded-lg animate-pulse flex items-center justify-center"><svg class="w-16 h-16 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
                      }
                    }}
                  />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-orange-900/40 font-medium text-sm tracking-widest uppercase"
                >
                  Yükleniyor
                </motion.p>
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
    </ErrorBoundary>
  );
};

export default App;
