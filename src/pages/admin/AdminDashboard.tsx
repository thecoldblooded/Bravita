import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getDashboardStats, DashboardStats, STATUS_CONFIG, OrderStatus } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { DashboardSkeleton } from "@/components/admin/skeletons";
import { formatDate } from "@/lib/utils";
import {
    DollarSign, ShoppingBag, TrendingUp, RefreshCw, ExternalLink,
    Users, Package, XCircle, UserPlus, Clock, CreditCard, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const DashboardCharts = lazy(() => import('./components/DashboardCharts'));

function DashboardContent() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30");
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    const retryCount = useRef(0);

    const loadStats = useCallback(async (manual = false) => {
        setIsLoading(true);
        try {
            const minLoadTime = manual ? 800 : 0;
            const startLoad = Date.now();

            const end = new Date();
            end.setHours(23, 59, 59, 999);

            const start = new Date();
            start.setDate(start.getDate() - parseInt(dateRange));
            start.setHours(0, 0, 0, 0);

            const data = await getDashboardStats(start, end);

            const elapsed = Date.now() - startLoad;
            if (manual && elapsed < minLoadTime) {
                await new Promise(r => setTimeout(r, minLoadTime - elapsed));
            }

            setStats(data);
            if (manual) toast.success("Veriler güncellendi");
            retryCount.current = 0;
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('AbortError'))) {
                retryCount.current = 0;
                return;
            }
            if (manual) toast.error("Veriler alınırken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        const channel = supabase
            .channel("admin-dashboard-order-updates")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => loadStats())
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => loadStats())
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => loadStats())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [loadStats]);

    if (isLoading && !stats) {
        return (
            <div className="max-w-7xl mx-auto">
                <DashboardSkeleton />
            </div>
        );
    }

    const cardClass = isDark
        ? "bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm"
        : "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm";

    const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
    const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
    const gridColor = isDark ? "#1e293b" : "#f3f4f6";
    const axisColor = isDark ? "#64748b" : "#9ca3af";
    const validOrderCount = stats?.order_count ?? 0;
    const cancelledOrderCount = stats?.cancelled_count ?? 0;
    const totalOrderCount = validOrderCount + cancelledOrderCount;

    const statCards = [
        {
            label: "Toplam Ciro",
            value: `₺${stats?.total_revenue?.toLocaleString("tr-TR") ?? "0"}`,
            badge: "Gelir",
            icon: DollarSign,
            colorLight: "bg-emerald-50 text-emerald-600",
            colorDark: "bg-emerald-500/20 text-emerald-400",
            badgeLight: "text-emerald-600 bg-emerald-50",
            badgeDark: "text-emerald-400 bg-emerald-500/20",
        },
        {
            label: "Toplam Sipariş",
            value: totalOrderCount.toString(),
            badge: "Satış",
            icon: ShoppingBag,
            colorLight: "bg-blue-50 text-blue-600",
            colorDark: "bg-blue-500/20 text-blue-400",
            badgeLight: "text-blue-600 bg-blue-50",
            badgeDark: "text-blue-400 bg-blue-500/20",
            sub: `Geçerli: ${validOrderCount}`,
        },
        {
            label: "İptal Edilen",
            value: cancelledOrderCount.toString(),
            badge: "İptal",
            icon: XCircle,
            colorLight: "bg-red-50 text-red-600",
            colorDark: "bg-red-500/20 text-red-400",
            badgeLight: "text-red-600 bg-red-50",
            badgeDark: "text-red-400 bg-red-500/20",
        },
        {
            label: "Sepet Ortalaması",
            value: `₺${validOrderCount > 0
                ? Math.round((stats?.total_revenue ?? 0) / validOrderCount).toLocaleString("tr-TR")
                : 0}`,
            badge: "Ortalama",
            icon: TrendingUp,
            colorLight: "bg-orange-50 text-orange-600",
            colorDark: "bg-orange-500/20 text-orange-400",
            badgeLight: "text-orange-600 bg-orange-50",
            badgeDark: "text-orange-400 bg-orange-500/20",
        },
        {
            label: "Yeni Üyeler",
            value: (stats?.new_member_count ?? 0).toString(),
            badge: "Üye",
            icon: UserPlus,
            colorLight: "bg-teal-50 text-teal-600",
            colorDark: "bg-teal-500/20 text-teal-400",
            badgeLight: "text-teal-600 bg-teal-50",
            badgeDark: "text-teal-400 bg-teal-500/20",
        },
        {
            label: "Aktif Ürünler",
            value: (stats?.active_product_count ?? 0).toString(),
            badge: "Ürün",
            icon: Package,
            colorLight: "bg-amber-50 text-amber-600",
            colorDark: "bg-amber-500/20 text-amber-400",
            badgeLight: "text-amber-600 bg-amber-50",
            badgeDark: "text-amber-400 bg-amber-500/20",
        },
    ];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black ${textPrimary} flex items-center gap-3`}>
                            <span className="bg-orange-500 w-2 h-8 rounded-full" />
                            Yönetim Paneli
                        </h1>
                        <p className={`text-sm ${textSecondary}`}>İşletmenizin genel durumunu görüntüleyin.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => loadStats(true)}
                            title="Verileri Yenile"
                            className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={`md:hidden ${isDark
                                ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 hover:text-green-300"
                                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-900"
                                }`}
                            onClick={() => window.open("https://mail.bravita.com.tr/Uvf2pzJY", "_blank", "noopener,noreferrer")}
                            title="E-posta Kampanyaları (BillionMail)"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className={`hidden md:inline-flex ${isDark
                                ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 hover:text-green-300"
                                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-900"
                                }`}
                            onClick={() => window.open("https://mail.bravita.com.tr/Uvf2pzJY", "_blank", "noopener,noreferrer")}
                            title="E-posta Kampanyaları (BillionMail)"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            E-posta Kampanyaları
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: "7", label: "Son 7 Gün" },
                        { value: "30", label: "Son 30 Gün" },
                        { value: "365", label: "Son 1 Yıl" },
                        { value: "730", label: "Son 2 Yıl" },
                    ].map(({ value, label }) => (
                        <Button
                            key={value}
                            variant={dateRange === value ? "default" : "outline"}
                            onClick={() => setDateRange(value)}
                            size="sm"
                            className={dateRange !== value && isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* 6 Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={cardClass}>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${isDark ? card.colorDark : card.colorLight}`}>
                                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? card.badgeDark : card.badgeLight}`}>
                                    {card.badge}
                                </span>
                            </div>
                            <p className={`text-xs md:text-sm ${textSecondary}`}>{card.label}</p>
                            <h3 className={`text-lg md:text-2xl font-bold ${textPrimary} truncate`}>{card.value}</h3>
                            {card.sub && <p className={`text-xs mt-0.5 ${textSecondary}`}>{card.sub}</p>}
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <Suspense fallback={<div className="h-80 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl" />}>
                <DashboardCharts
                    stats={stats}
                    isDark={isDark}
                    cardClass={cardClass}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    gridColor={gridColor}
                    axisColor={axisColor}
                />
            </Suspense>

            {/* Recent Activity Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
                {/* Recent Orders */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                        Son Siparişler
                    </h3>
                    <div className="space-y-3">
                        {(stats?.recent_orders ?? []).length === 0 ? (
                            <p className={`text-sm ${textSecondary} text-center py-4`}>Henüz sipariş yok</p>
                        ) : (
                            stats?.recent_orders?.map((order) => {
                                const statusConfig = STATUS_CONFIG[order.status as OrderStatus] ?? { label: order.status, color: "text-gray-700", bgColor: "bg-gray-100" };
                                return (
                                    <div
                                        key={order.id}
                                        className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isDark ? "border-slate-700" : "border-gray-100"}`}
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <p className={`text-sm font-medium ${textPrimary} truncate`}>
                                                {order.full_name || "İsimsiz"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? "bg-slate-700 text-slate-300" : statusConfig.bgColor + " " + statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </span>
                                                {order.payment_method === "credit_card" ? (
                                                    <CreditCard className={`w-3 h-3 ${textSecondary}`} />
                                                ) : (
                                                    <Banknote className={`w-3 h-3 ${textSecondary}`} />
                                                )}
                                                <span className={`text-[10px] ${textSecondary}`}>
                                                    {formatDate(order.created_at, { day: "numeric", month: "short", year: undefined })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-semibold ${textPrimary} shrink-0`}>
                                            ₺{order.total?.toLocaleString("tr-TR")}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Recent Cancellations */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <XCircle className="w-4 h-4 text-red-500" />
                        Son İptaller
                    </h3>
                    <div className="space-y-3">
                        {(stats?.recent_cancellations ?? []).length === 0 ? (
                            <p className={`text-sm ${textSecondary} text-center py-4`}>Henüz iptal yok</p>
                        ) : (
                            stats?.recent_cancellations?.map((cancel) => (
                                <div
                                    key={cancel.id}
                                    className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isDark ? "border-slate-700" : "border-gray-100"}`}
                                >
                                    <div className="min-w-0 flex-1 mr-3">
                                        <p className={`text-sm font-medium ${textPrimary} truncate`}>
                                            {cancel.full_name || "İsimsiz"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {cancel.cancellation_reason && (
                                                <span className={`text-[10px] ${textSecondary} truncate max-w-30`} title={cancel.cancellation_reason}>
                                                    {cancel.cancellation_reason}
                                                </span>
                                            )}
                                            <Clock className={`w-3 h-3 ${textSecondary} shrink-0`} />
                                            <span className={`text-[10px] ${textSecondary} shrink-0`}>
                                                {formatDate(cancel.created_at, { day: "numeric", month: "short", year: undefined })}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-semibold text-red-500 shrink-0`}>
                                        ₺{cancel.total?.toLocaleString("tr-TR")}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Members */}
                <div className={cardClass}>
                    <h3 className={`text-base font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <Users className="w-4 h-4 text-teal-500" />
                        Son Üyeler
                    </h3>
                    <div className="space-y-3">
                        {(stats?.recent_members ?? []).length === 0 ? (
                            <p className={`text-sm ${textSecondary} text-center py-4`}>Henüz üye yok</p>
                        ) : (
                            stats?.recent_members?.map((member) => (
                                <div
                                    key={member.id}
                                    className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isDark ? "border-slate-700" : "border-gray-100"}`}
                                >
                                    <div className="min-w-0 flex-1 mr-3">
                                        <p className={`text-sm font-medium ${textPrimary} truncate`}>
                                            {member.full_name || "İsimsiz"}
                                        </p>
                                        <p className={`text-[10px] ${textSecondary} truncate`}>
                                            {member.email}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] ${textSecondary} shrink-0`}>
                                        {formatDate(member.created_at, { day: "numeric", month: "short", year: undefined })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <AdminGuard>
            <AdminLayout>
                <DashboardContent />
            </AdminLayout>
        </AdminGuard>
    );
}
