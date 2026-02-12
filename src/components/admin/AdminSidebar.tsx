import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, LogOut, ChevronRight, Tags, Ticket, Home, Sun, Moon, Shield, LifeBuoy, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const menuItems = [
    { path: "/admin/orders", label: "Siparişler", icon: Package },
    { path: "/admin/products", label: "Ürünler & Stok", icon: Tags },
    { path: "/admin/promotions", label: "Promosyonlar", icon: Ticket },
    { path: "/admin/support", label: "Destek Talepleri", icon: LifeBuoy },
];

export function AdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isSuperAdmin } = useAuth();
    const { theme, toggleTheme } = useAdminTheme();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);

    const displayMenuItems = [...menuItems];
    if (isSuperAdmin) {
        displayMenuItems.push({ path: "/admin/emails", label: "E-posta Yönetimi", icon: Mail });
        displayMenuItems.push({ path: "/admin/admins", label: "Admin Yönetimi", icon: Users });
        displayMenuItems.push({ path: "/admin/logs", label: "Sistem Logları", icon: Shield });
    }

    const isDark = theme === "dark";

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

        const fetchUnreadSupport = async () => {
            const { count } = await supabase
                .from('support_tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');

            setUnreadSupportCount(count || 0);
        };

        fetchUnread();
        fetchUnreadSupport();

        const ordersChannel = supabase
            .channel('admin-sidebar-badges-orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                if (!location.pathname.startsWith('/admin/orders')) {
                    fetchUnread();
                }
            })
            .subscribe();

        const supportChannel = supabase
            .channel('admin-sidebar-badges-support')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchUnreadSupport();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(supportChannel);
        };
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "https://bravita.com";
    };

    return (
        <aside className={`w-64 h-screen sticky top-0 flex flex-col transition-colors duration-300 ${isDark
            ? "bg-slate-900 border-r border-slate-800"
            : "bg-white border-r border-gray-100"
            }`}>
            {/* Logo */}
            <div className={`p-6 border-b ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                <div className="flex items-center justify-between">
                    <Link to="/admin" className="block">
                        <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-gray-900"}`}>
                            <span className="text-orange-500">Bravita</span> Admin
                        </h1>
                    </Link>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-lg transition-all ${isDark
                            ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        title={isDark ? "Açık Mod" : "Koyu Mod"}
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                <button
                    onClick={() => navigate("/admin")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${location.pathname === "/admin" || location.pathname === "/admin/dashboard"
                        ? isDark
                            ? "bg-orange-500/20 text-orange-400 shadow-sm ring-1 ring-orange-500/30"
                            : "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                        : isDark
                            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Genel Bakış
                </button>

                <div className="pt-4 pb-2">
                    <p className={`px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"
                        }`}>Yönetim</p>
                </div>

                {displayMenuItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== "/" && location.pathname.startsWith(item.path));

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group cursor-pointer relative ${isActive
                                ? isDark
                                    ? "bg-orange-500/20 text-orange-400 shadow-sm ring-1 ring-orange-500/30"
                                    : "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                                : isDark
                                    ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive
                                ? "text-orange-500"
                                : isDark
                                    ? "text-gray-500 group-hover:text-gray-300"
                                    : "text-gray-400 group-hover:text-gray-600"
                                }`} />
                            <span className="font-medium">{item.label}</span>

                            {item.path === "/admin/orders" && unreadCount > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {unreadCount}
                                </span>
                            )}

                            {item.path === "/admin/support" && unreadSupportCount > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {unreadSupportCount}
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
            <div className={`p-4 border-t ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-3 ${isDark ? "bg-slate-800" : "bg-gray-50"
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-orange-500/20" : "bg-orange-100"
                        }`}>
                        <span className={`font-semibold ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                            {user?.full_name || "Admin"}
                        </p>
                        <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors mb-2 ${isDark
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <Home className="w-5 h-5" />
                    <span className="text-sm font-medium">Ana Siteye Dön</span>
                </button>
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors ${isDark
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-red-600 hover:bg-red-50"
                        }`}
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Çıkış Yap</span>
                </button>
            </div>
        </aside>
    );
}
