import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CompleteProfile from "./pages/CompleteProfile";
import Profile from "./pages/Profile";
import UpdatePassword from "./pages/UpdatePassword";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import PeriodicGif from "@/components/PeriodicGif";
import PromotionMarquee from "@/components/PromotionMarquee";
import "@/i18n/config"; // Ensure i18n is initialized
import CookieConsent from "@/components/CookieConsent";
import UnderConstruction from "@/components/UnderConstruction";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminOrderDetail from "@/pages/admin/AdminOrderDetail";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";

/**
 * 🚧 MAINTENANCE MODE FLAG
 * 
 * Set to `true` to show "Under Construction" page to all visitors
 * Set to `false` to show the normal website
 * 
 * TEMPORARY: Remove this when the site is ready for production
 */
const MAINTENANCE_MODE = false;

import alpacaGif from "@/assets/alpaca.webp";
const GIF_URL = alpacaGif; // assets klasöründeki alpaca.webp

const queryClient = new QueryClient();

import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Loader from "@/components/ui/Loader";

// Separate component to use useLocation inside BrowserRouter
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
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
        <Route path="/admin/admins" element={<AdminUsers />} />
        <Route path="/admin/logs" element={<AdminAuditLogs />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Only show these on non-admin routes */}
      {!isAdminRoute && (
        <>
          {/* Her 1 dakikada bir sol altta görünen GIF */}
          <PeriodicGif
            gifSrc={GIF_URL}
            intervalMs={60000} // 1 dakika = 60000ms
            alt="Periodic animation"
          />
          <PromotionMarquee />
          <div className="h-12 md:h-14" aria-hidden="true" /> {/* Spacer for marquee */}
          <CookieConsent />
        </>
      )}
    </>
  );
};

const App = () => {
  const { isSplashScreenActive, isPasswordRecovery } = useAuth();

  // 🚧 Maintenance mode - show under construction page
  if (MAINTENANCE_MODE) {
    return <UnderConstruction />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          {isSplashScreenActive ? (
            <div className="fixed inset-0 bg-[#FFFBF7] z-50 flex flex-col items-center justify-center">
              <Loader size="280px" noMargin />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="text-orange-900/40 font-medium text-sm tracking-widest uppercase mt-4"
              >
                Yükleniyor
              </motion.p>
            </div>
          ) : isPasswordRecovery ? (
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="*" element={<UpdatePassword />} />
              </Routes>
            </BrowserRouter>
          ) : (
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </BrowserRouter>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
