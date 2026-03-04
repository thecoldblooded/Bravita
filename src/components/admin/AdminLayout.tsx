import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "./AdminSidebar";
import { Order } from "@/lib/admin";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";
import { Menu, X } from "lucide-react";

interface AdminLayoutProps {
    children: React.ReactNode;
}

import { CommandPalette } from "./CommandPalette";

export function AdminLayout({ children }: AdminLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useAdminTheme();

    useEffect(() => {
        const channel = supabase
            .channel('admin-orders-tracking')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    if (location.pathname !== '/admin/orders') {
                        const newOrder = payload.new as Order;
                        const total = newOrder.order_details?.total || 0;
                        toast.success(`Yeni Sipariş Geldi! #${newOrder.id.substring(0, 8).toUpperCase()}`, {
                            description: `Tutar: ₺${Number(total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
                            action: {
                                label: "Görüntüle",
                                onClick: () => navigate(`/admin/orders/${newOrder.id}`)
                            },
                            duration: 5000,
                        });
                    }
                }
            )
            .subscribe((status) => {
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [navigate, location.pathname]);

    // Close mobile menu on route change
    const [prevPathname, setPrevPathname] = useState(location.pathname);
    if (location.pathname !== prevPathname) {
        setPrevPathname(location.pathname);
        setIsMobileMenuOpen(false);
    }

    return (
        <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${theme === "dark"
            ? "bg-gray-900 admin-dark"
            : "bg-[#FFFBF7]"
            }`}>

            {/* Mobile Header */}
            <header className={`md:hidden flex items-center justify-between p-4 sticky top-0 z-40 border-b ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                <h1 className={`text-lg font-bold ${theme === "dark" ? "text-slate-50" : "text-gray-900"}`}>
                    <span className="text-orange-500">Bravita</span> Admin
                </h1>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`p-2 rounded-lg ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"}`}
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            <AdminSidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <main className="flex-1 p-4 md:p-8 overflow-auto w-full min-w-0 custom-scrollbar">
                {children}
            </main>
            <CommandPalette />

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-45 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}