import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "./AdminSidebar";
import { Order } from "@/lib/admin";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";

interface AdminLayoutProps {
    children: React.ReactNode;
}

import { CommandPalette } from "./CommandPalette";

export function AdminLayout({ children }: AdminLayoutProps) {
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
                    // console.log("Realtime event received:", payload);
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
                // console.log("Realtime Subscription Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [navigate, location.pathname]);

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${theme === "dark"
            ? "bg-gray-900 admin-dark"
            : "bg-[#FFFBF7]"
            }`}>
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
            <CommandPalette />
        </div>
    );
}