import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getDashboardStats, DashboardStats } from "@/lib/admin";
import { DashboardSkeleton } from "@/components/admin/skeletons";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function DashboardContent() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30"); // days
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
            retryCount.current = 0; // Success, reset retries
        } catch (error: unknown) {
            // Retry on AbortError (max 3 times)
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('AbortError'))) {
                console.debug("Dashboard stats load was aborted (expected on navigation)");
                retryCount.current = 0;
                // Stop retrying but don't show error to user if it's just an abort
                return;
            }
            console.error("Failed to load dashboard stats:", error);
            if (manual) toast.error("Veriler alınırken hata oluştu");
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (isLoading && !stats) {
        return (
            <div className="max-w-7xl mx-auto">
                <DashboardSkeleton />
            </div>
        );
    }

    // Dark mode styles
    const cardClass = isDark
        ? "bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-sm"
        : "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm";

    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const gridColor = isDark ? "#374151" : "#f3f4f6";
    const axisColor = isDark ? "#9ca3af" : "#9ca3af";

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-2xl font-bold ${textPrimary}`}>Yönetim Paneli</h1>
                    <p className={textSecondary}>İşletmenizin genel durumunu görüntüleyin.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={dateRange === "7" ? "default" : "outline"}
                        onClick={() => setDateRange("7")}
                        size="sm"
                        className={dateRange !== "7" && isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                    >
                        Son 7 Gün
                    </Button>
                    <Button
                        variant={dateRange === "30" ? "default" : "outline"}
                        onClick={() => setDateRange("30")}
                        size="sm"
                        className={dateRange !== "30" && isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                    >
                        Son 30 Gün
                    </Button>
                    <Button
                        variant={dateRange === "365" ? "default" : "outline"}
                        onClick={() => setDateRange("365")}
                        size="sm"
                        className={dateRange !== "365" && isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                    >
                        Son 1 Yıl
                    </Button>
                    <Button
                        variant={dateRange === "730" ? "default" : "outline"}
                        onClick={() => setDateRange("730")}
                        size="sm"
                        className={dateRange !== "730" && isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                    >
                        Son 2 Yıl
                    </Button>
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
                        className={isDark
                            ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 hover:text-green-300"
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-900"
                        }
                        onClick={() => window.open('https://mail.bravita.com.tr', '_blank')}
                        title="E-posta Kampanyaları (BillionMail)"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        E-posta Kampanyaları
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"}`}>
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? "text-green-400 bg-green-500/20" : "text-green-600 bg-green-50"}`}>Gelir</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>Toplam Ciro</p>
                    <h3 className={`text-2xl font-bold ${textPrimary}`}>₺{stats?.total_revenue?.toLocaleString("tr-TR")}</h3>
                </div>

                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? "text-blue-400 bg-blue-500/20" : "text-blue-600 bg-blue-50"}`}>Satış</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>Geçerli Sipariş</p>
                    <h3 className={`text-2xl font-bold ${textPrimary}`}>{stats?.order_count}</h3>
                </div>

                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"}`}>
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? "text-red-400 bg-red-500/20" : "text-red-600 bg-red-50"}`}>İptal</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>İptal Edilen</p>
                    <h3 className={`text-2xl font-bold ${textPrimary}`}>{stats?.cancelled_count || 0}</h3>
                </div>

                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? "text-orange-400 bg-orange-500/20" : "text-orange-600 bg-orange-50"}`}>Ortalama</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>Sepet Ortalaması</p>
                    <h3 className={`text-2xl font-bold ${textPrimary}`}>
                        ₺{stats?.order_count > 0
                            ? Math.round(stats.total_revenue / stats.order_count).toLocaleString("tr-TR")
                            : 0}
                    </h3>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardClass}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-6 flex items-center gap-2`}>
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                        Satış Grafiği
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.daily_sales}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                    stroke={axisColor}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke={axisColor}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `₺${value}`}
                                />
                                <Tooltip
                                    formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Ciro"]}
                                    labelFormatter={(date) => formatDate(date)}
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                        color: isDark ? "#f3f4f6" : "#111827"
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#f97316"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={cardClass}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-6 flex items-center gap-2`}>
                        <ShoppingBag className="w-5 h-5 text-blue-500" />
                        Günlük Sipariş
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.daily_sales}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                    stroke={axisColor}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    stroke={axisColor}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                                        color: isDark ? "#f3f4f6" : "#111827"
                                    }}
                                    labelFormatter={(date) => formatDate(date)}
                                />
                                <Bar dataKey="count" name="Sipariş" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
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

