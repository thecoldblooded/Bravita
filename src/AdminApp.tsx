import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import "@/i18n/config";

import { AdminThemeProvider } from "@/contexts/AdminThemeContext";

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/AdminOrderDetail"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/AdminPromoCodes"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminEmails = lazy(() => import("@/pages/admin/AdminEmails"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

export default function AdminApp() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <AdminThemeProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <Suspense fallback={null}>
                            <Routes>
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/admin/orders" element={<AdminOrders />} />
                                <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
                                <Route path="/admin/products" element={<AdminProducts />} />
                                <Route path="/admin/promotions" element={<AdminPromoCodes />} />
                                <Route path="/admin/support" element={<AdminSupport />} />
                                <Route path="/admin/emails" element={<AdminEmails />} />
                                <Route path="/admin/admins" element={<AdminUsers />} />
                                <Route path="/admin/logs" element={<AdminAuditLogs />} />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Suspense>
                    </BrowserRouter>
                </AdminThemeProvider>
            </TooltipProvider>
        </QueryClientProvider>
    );
}
