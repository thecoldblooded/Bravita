import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AdminSidebar } from "./AdminSidebar";
import { Order } from "@/lib/admin";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

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
                    console.log("Realtime event received:", payload);
                    // If we are mostly on orders page, we might want to refresh the list automatically effectively.
                    // But user asked for notification if NOT on orders page.
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

                        // Play a subtle sound? Optional. Keeping it visual for now.
                    }
                }
            )
            .subscribe((status) => {
                console.log("Realtime Subscription Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [navigate, location.pathname]);

    return (
        <div className="min-h-screen bg-[#FFFBF7] flex">
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
