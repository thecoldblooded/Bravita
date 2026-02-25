import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, LogOut, ChevronRight, Tags, Ticket, Home, Sun, Moon, Shield, LifeBuoy, Mail, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { supabase } from "@/lib/supabase";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem("bravita_admin_sidebar_collapsed");
        return saved === "true";
    });


    const displayMenuItems = [...menuItems];
    if (isSuperAdmin) {
        displayMenuItems.push({ path: "/admin/emails", label: "E-posta Yönetimi", icon: Mail });
        displayMenuItems.push({ path: "/admin/admins", label: "Admin Yönetimi", icon: Users });
        displayMenuItems.push({ path: "/admin/logs", label: "Sistem Logları", icon: Shield });
    }

    const isDark = theme === "dark";

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem("bravita_admin_sidebar_collapsed", String(next));
    };

    // mark as read logic moved to separate effect without sync state update
    useEffect(() => {
        if (location.pathname.startsWith('/admin/orders')) {
            const now = new Date().toISOString();
            localStorage.setItem('bravita_admin_last_view', now);
        }
    }, [location.pathname]);

    // Fetch unread count
    useEffect(() => {
        const fetchUnread = async () => {
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

    const displayedUnreadCount = location.pathname.startsWith('/admin/orders') ? 0 : unreadCount;

    return (
        <aside className={cn(
            "fixed md:sticky top-0 z-40 h-dvh flex flex-col border-r transition-all duration-300",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200",
            collapsed ? "w-20" : "w-65"
        )}>
            {/* Logo */}
            <div className={`p-6 border-b ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                <div className="flex items-center justify-between">
                    <Link to="/admin" className="block">
                        {collapsed ? (
                            <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-gray-900"}`}>
                                <span className="text-orange-500">B</span>
                            </h1>
                        ) : (
                            <h1 className={`text-xl font-bold ${isDark ? "text-slate-50" : "text-gray-900"}`}>
                                <span className="text-orange-500">Bravita</span> Admin
                            </h1>
                        )}
                    </Link>
                    {!collapsed && (
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
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                <button
                    onClick={() => navigate("/admin")}
                    title={collapsed ? "Genel Bakış" : undefined}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${location.pathname === "/admin" || location.pathname === "/admin/dashboard"
                        ? isDark
                            ? "bg-orange-500/20 text-orange-400 shadow-sm ring-1 ring-orange-500/30"
                            : "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                        : isDark
                            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5 shrink-0" />
                    {!collapsed && "Genel Bakış"}
                </button>

                {!collapsed && (
                    <div className="pt-4 pb-2">
                        <p className={`px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"
                            }`}>Yönetim</p>
                    </div>
                )}

                {collapsed && <div className="pt-2" />}

                {displayMenuItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== "/" && location.pathname.startsWith(item.path));

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            title={collapsed ? item.label : undefined}
                            className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group cursor-pointer relative ${isActive
                                ? isDark
                                    ? "bg-orange-500/20 text-orange-400 shadow-sm ring-1 ring-orange-500/30"
                                    : "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                                : isDark
                                    ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 shrink-0 ${isActive
                                ? "text-orange-500"
                                : isDark
                                    ? "text-gray-500 group-hover:text-gray-300"
                                    : "text-gray-400 group-hover:text-gray-600"
                                }`} />
                            {!collapsed && <span className="font-medium">{item.label}</span>}

                            {!collapsed && item.path === "/admin/orders" && displayedUnreadCount > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {displayedUnreadCount}
                                </span>
                            )}

                            {collapsed && item.path === "/admin/orders" && displayedUnreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                    {displayedUnreadCount}
                                </span>
                            )}

                            {!collapsed && item.path === "/admin/support" && unreadSupportCount > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {unreadSupportCount}
                                </span>
                            )}

                            {collapsed && item.path === "/admin/support" && unreadSupportCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                    {unreadSupportCount}
                                </span>
                            )}

                            {!collapsed && isActive && item.path !== "/admin/orders" && (
                                <m.div
                                    layoutId="activeIndicator"
                                    className="ml-auto"
                                >
                                    <ChevronRight className="w-4 h-4 text-orange-500" />
                                </m.div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <div className={`px-4 py-2 border-t ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                <button
                    onClick={toggleCollapsed}
                    className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isDark
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                    title={collapsed ? "Genişlet" : "Daralt"}
                >
                    {collapsed
                        ? <PanelLeftOpen className="w-5 h-5 shrink-0" />
                        : <PanelLeftClose className="w-5 h-5 shrink-0" />
                    }
                    {!collapsed && <span className="font-medium">Daralt</span>}
                </button>
            </div>

            {/* User section */}
            <div className={`p-4 border-t ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                {collapsed ? (
                    <>
                        {/* Collapsed: show avatar only */}
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-orange-500/20" : "bg-orange-100"
                                }`}>
                                <span className={`font-semibold ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
                                </span>
                            </div>
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
                            <button
                                onClick={() => window.location.href = '/'}
                                className={`p-2 rounded-lg transition-all ${isDark
                                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    : "text-gray-500 hover:bg-gray-100"
                                    }`}
                                title="Ana Siteye Dön"
                            >
                                <Home className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleLogout}
                                className={`p-2 rounded-lg transition-all ${isDark
                                    ? "text-red-400 hover:bg-red-500/10"
                                    : "text-red-600 hover:bg-red-50"
                                    }`}
                                title="Çıkış Yap"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </aside>
    );
}
