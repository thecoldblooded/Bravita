import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, LogOut, ChevronRight, Tags, Ticket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const menuItems = [
    { path: "/admin/orders", label: "Siparişler", icon: Package },
    { path: "/admin/products", label: "Ürünler & Stok", icon: Tags },
    { path: "/admin/promotions", label: "Promosyonlar", icon: Ticket },
    { path: "/admin/admins", label: "Admin Yönetimi", icon: Users },
];

export function AdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    // Mark as read when entering orders page
    useEffect(() => {
        if (location.pathname.startsWith('/admin/orders')) {
            const now = new Date().toISOString();
            localStorage.setItem('bravita_admin_last_view', now);
            setUnreadCount(0);
        }
    }, [location.pathname]);

    // Fetch unread count
    useEffect(() => {
        const fetchUnread = async () => {
            // If currently on orders page, unread is 0
            if (location.pathname.startsWith('/admin/orders')) {
                setUnreadCount(0);
                return;
            }

            const lastView = localStorage.getItem('bravita_admin_last_view') || new Date(0).toISOString();

            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .gt('created_at', lastView);

            setUnreadCount(count || 0);
        };

        fetchUnread();

        const channel = supabase
            .channel('admin-sidebar-badges')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                if (!location.pathname.startsWith('/admin/orders')) {
                    fetchUnread();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "https://bravita.com";
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100">
                <Link to="/admin" className="block">
                    <h1 className="text-xl font-bold text-gray-900">
                        <span className="text-orange-500">Bravita</span> Admin
                    </h1>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                <button
                    onClick={() => navigate("/admin")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${location.pathname === "/admin" || location.pathname === "/admin/dashboard"
                        ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Genel Bakış
                </button>

                <div className="pt-4 pb-2">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Yönetim</p>
                </div>

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== "/" && location.pathname.startsWith(item.path));

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group cursor-pointer relative ${isActive
                                ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"}`} />
                            <span className="font-medium">{item.label}</span>

                            {item.path === "/admin/orders" && unreadCount > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {unreadCount}
                                </span>
                            )}

                            {isActive && item.path !== "/admin/orders" && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="ml-auto"
                                >
                                    <ChevronRight className="w-4 h-4 text-orange-500" />
                                </motion.div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl mb-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">
                            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.full_name || "Admin"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </aside>
    );
}
