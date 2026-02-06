import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getDashboardStats, DashboardStats } from "@/lib/admin";
import { DashboardSkeleton } from "@/components/admin/skeletons";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30"); // days

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
            <AdminGuard>
                <AdminLayout>
                    <div className="max-w-7xl mx-auto">
                        <DashboardSkeleton />
                    </div>
                </AdminLayout>
            </AdminGuard>
        );
    }

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli</h1>
                            <p className="text-gray-500">İşletmenizin genel durumunu görüntüleyin.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={dateRange === "7" ? "default" : "outline"}
                                onClick={() => setDateRange("7")}
                                size="sm"
                            >
                                Son 7 Gün
                            </Button>
                            <Button
                                variant={dateRange === "30" ? "default" : "outline"}
                                onClick={() => setDateRange("30")}
                                size="sm"
                            >
                                Son 30 Gün
                            </Button>
                            <Button
                                variant={dateRange === "365" ? "default" : "outline"}
                                onClick={() => setDateRange("365")}
                                size="sm"
                            >
                                Son 1 Yıl
                            </Button>
                            <Button
                                variant={dateRange === "730" ? "default" : "outline"}
                                onClick={() => setDateRange("730")}
                                size="sm"
                            >
                                Son 2 Yıl
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => loadStats(true)}
                                title="Verileri Yenile"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-medium">Gelir</span>
                            </div>
                            <p className="text-gray-500 text-sm">Toplam Ciro</p>
                            <h3 className="text-2xl font-bold text-gray-900">₺{stats?.total_revenue?.toLocaleString("tr-TR")}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs font-medium">Satış</span>
                            </div>
                            <p className="text-gray-500 text-sm">Geçerli Sipariş</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.order_count}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs font-medium">İptal</span>
                            </div>
                            <p className="text-gray-500 text-sm">İptal Edilen</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.cancelled_count || 0}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-xs font-medium">Ortalama</span>
                            </div>
                            <p className="text-gray-500 text-sm">Sepet Ortalaması</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                ₺{stats?.order_count > 0
                                    ? Math.round(stats.total_revenue / stats.order_count).toLocaleString("tr-TR")
                                    : 0}
                            </h3>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
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
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                            stroke="#9ca3af"
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#9ca3af"
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => `₺${value}`}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`₺${Number(value).toLocaleString("tr-TR")}`, "Ciro"]}
                                            labelFormatter={(date) => formatDate(date)}
                                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
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

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-blue-500" />
                                Günlük Sipariş
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.daily_sales}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => formatDate(date, { day: "numeric", month: "short", year: undefined })}
                                            stroke="#9ca3af"
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            stroke="#9ca3af"
                                            tick={{ fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                            labelFormatter={(date) => formatDate(date)}
                                        />
                                        <Bar dataKey="count" name="Sipariş" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </AdminGuard>
    );
}
