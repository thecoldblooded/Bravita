import { useEffect, useState, useCallback, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Package, Search, Filter, ChevronRight, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getAllOrders, Order, OrderStatus, STATUS_CONFIG } from "@/lib/admin";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function OrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState<"created_at" | "total">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Input Refs for manual filtering
    const searchRef = useRef<HTMLInputElement>(null);
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);
    const minAmountRef = useRef<HTMLInputElement>(null);
    const maxAmountRef = useRef<HTMLInputElement>(null);

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const searchVal = searchRef.current?.value || "";
            const startVal = startDateRef.current?.value || "";
            const endVal = endDateRef.current?.value || "";
            const minVal = minAmountRef.current?.value || "";
            const maxVal = maxAmountRef.current?.value || "";

            const filters: Parameters<typeof getAllOrders>[0] = {
                status: statusFilter || undefined,
                search: searchVal || searchParams.get("highlight") || searchParams.get("search") || undefined,
                startDate: startVal || undefined,
                endDate: endVal || undefined,
                minAmount: minVal ? parseFloat(minVal) : undefined,
                maxAmount: maxVal ? parseFloat(maxVal) : undefined,
                sortBy,
                sortOrder
            };

            const data = await getAllOrders(filters);
            setOrders(data.orders);
            setTotalCount(data.count);
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('AbortError'))) {
                console.warn("Admin orders load aborted. Retrying...");
                setTimeout(() => loadOrders(), 1000);
                return;
            }
            console.error("Failed to load orders:", error);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, sortBy, sortOrder, searchParams]);

    // Auto-load on status/sort change (Tabs usually expect immediate feedback)
    useEffect(() => {
        const urlHighlight = searchParams.get("highlight") || searchParams.get("search");
        if (urlHighlight) {
            setHighlightedId(urlHighlight);
            // We DON'T set searchRef.current.value here anymore to keep the bar clean
            // but we need to ensure the order is actually fetched
            setTimeout(() => setHighlightedId(null), 6000);
        }

        loadOrders();

        // Real-time subscription for NEW orders
        const channel = supabase
            .channel('admin-order-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders'
                },
                () => {
                    // Update the list and show notification
                    loadOrders();
                    toast.info("Yeni bir siparişiniz var!");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadOrders, searchParams]);

    const handleClearFilters = () => {
        if (searchRef.current) searchRef.current.value = "";
        if (startDateRef.current) startDateRef.current.value = "";
        if (endDateRef.current) endDateRef.current.value = "";
        if (minAmountRef.current) minAmountRef.current.value = "";
        if (maxAmountRef.current) maxAmountRef.current.value = "";
        setStatusFilter("");

        // If there are parameters, clear them and let useEffect trigger loadOrders
        // If no parameters, manual loadOrders call
        if (searchParams.toString() !== "") {
            setSearchParams({});
        } else {
            loadOrders();
        }
    };

    const statusOptions: { value: OrderStatus | ""; label: string }[] = [
        { value: "", label: "Tüm Durumlar" },
        { value: "pending", label: "Beklemede" },
        { value: "processing", label: "İşleniyor" },
        { value: "preparing", label: "Hazırlanıyor" },
        { value: "shipped", label: "Kargoda" },
        { value: "delivered", label: "Teslim Edildi" },
        { value: "cancelled", label: "İptal Edildi" },
    ];

    // Dark mode styles
    const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
    const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
    const cardClass = isDark ? "bg-slate-800 border-slate-700 shadow-sm" : "bg-white border-gray-100 shadow-sm";
    const inputClass = isDark ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-orange-500/50" : "";
    const tableHeaderClass = isDark ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-100";
    const rowHoverClass = isDark ? "hover:bg-slate-800/50" : "hover:bg-gray-50";
    const dividerClass = isDark ? "divide-slate-700" : "divide-gray-50";

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-2xl font-bold ${textPrimary}`}>Siparişler</h1>
                    <p className={textSecondary}>Tüm siparişleri görüntüleyin ve yönetin</p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={loadOrders}
                    title="Listeyi Yenile"
                    className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* Filters */}
            <div className={`rounded-2xl border p-6 mb-6 ${cardClass}`}>
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex-1 min-w-62.5">
                        <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                            <Input
                                ref={searchRef}
                                placeholder="Sipariş ID veya müşteri ara..."
                                className={`pl-10 ${inputClass}`}
                                onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant={statusFilter === option.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter(option.value)}
                                className={
                                    statusFilter === option.value
                                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                                        : isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""
                                }
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className={`flex flex-wrap items-center gap-4 pt-4 border-t ${isDark ? "border-gray-700" : "border-gray-50"}`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ${textSecondary}`}>Tarih:</span>
                        <Input
                            ref={startDateRef}
                            type="date"
                            className={`w-36 h-9 ${inputClass}`}
                        />
                        <span className={isDark ? "text-gray-500" : "text-gray-400"}>-</span>
                        <Input
                            ref={endDateRef}
                            type="date"
                            className={`w-36 h-9 ${inputClass}`}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-sm ml-2 ${textSecondary}`}>Tutar:</span>
                        <Input
                            ref={minAmountRef}
                            type="number"
                            placeholder="Min"
                            className={`w-24 h-9 ${inputClass}`}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && loadOrders()}
                        />
                        <Input
                            ref={maxAmountRef}
                            type="number"
                            placeholder="Max"
                            className={`w-24 h-9 ${inputClass}`}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && loadOrders()}
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className={isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"}
                        >
                            Filtreleri Temizle
                        </Button>
                        <Button
                            size="sm"
                            onClick={loadOrders}
                            className={isDark ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtrele
                        </Button>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border shadow-sm overflow-hidden ${cardClass}`}
            >
                {isLoading ? (
                    <div className={`divide-y ${dividerClass}`}>
                        {[...Array(8)].map((_, i) => (
                            <div key={`order-skeleton-${i}`} className="grid grid-cols-12 gap-4 px-6 py-5">
                                <div className="col-span-3 flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div>
                                        <Skeleton className="h-4 w-24 mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <Skeleton className="h-4 w-32 mb-1" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <div className="col-span-2">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <div className="col-span-2">
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-5 w-5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Package className={`w-12 h-12 mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                        <p className={textSecondary}>Sipariş bulunamadı</p>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className={`grid grid-cols-12 gap-4 px-6 py-4 border-b text-sm font-medium ${tableHeaderClass} ${textSecondary}`}>
                            <div className="col-span-3">Sipariş</div>
                            <div className="col-span-3">Müşteri</div>
                            <div className="col-span-2">Durum</div>
                            <div
                                className={`col-span-2 flex items-center gap-1 cursor-pointer ${isDark ? "hover:text-white" : "hover:text-gray-900"}`}
                                onClick={() => {
                                    if (sortBy === "total") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                    else { setSortBy("total"); setSortOrder("desc"); }
                                }}
                            >
                                Tutar {sortBy === "total" && (sortOrder === "asc" ? "↑" : "↓")}
                                <ArrowUpDown className="w-3 h-3" />
                            </div>
                            <div
                                className={`col-span-2 flex items-center gap-1 cursor-pointer ${isDark ? "hover:text-white" : "hover:text-gray-900"}`}
                                onClick={() => {
                                    if (sortBy === "created_at") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                    else { setSortBy("created_at"); setSortOrder("desc"); }
                                }}
                            >
                                Tarih {sortBy === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                                <ArrowUpDown className="w-3 h-3" />
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className={`divide-y ${dividerClass}`}>
                            {orders.map((order) => {
                                const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;
                                const isHighlighted = highlightedId === order.id;

                                return (
                                    <Link
                                        key={order.id}
                                        to={`/admin/orders/${order.id}`}
                                        className={`grid grid-cols-12 gap-4 px-6 py-4 transition-all items-center group relative ${rowHoverClass} ${isHighlighted
                                            ? isDark
                                                ? "bg-orange-500/5 z-10"
                                                : "bg-orange-50/50 z-10 shadow-sm"
                                            : ""
                                            }`}
                                    >
                                        {isHighlighted && (
                                            <m.div
                                                className="absolute inset-0 pointer-events-none z-20 rounded-lg border-2 border-orange-500"
                                                initial={{ boxShadow: "0 0 0 0px rgba(249, 115, 22, 0.4)", borderColor: "rgba(249, 115, 22, 0.8)" }}
                                                animate={{
                                                    boxShadow: [
                                                        "0 0 0 0px rgba(249, 115, 22, 0.4)",
                                                        "0 0 0 10px rgba(249, 115, 22, 0)"
                                                    ],
                                                    borderColor: [
                                                        "rgba(249, 115, 22, 0.8)",
                                                        "rgba(249, 115, 22, 0.2)"
                                                    ],
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    ease: "easeOut",
                                                    repeatDelay: 0.1
                                                }}
                                            />
                                        )}
                                        <div className="col-span-3 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                                                <Package className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                                            </div>
                                            <span className={`font-mono font-medium ${textPrimary}`}>
                                                #{order.id.slice(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="col-span-3">
                                            <p className={`font-medium ${textPrimary}`}>
                                                {order.profiles?.full_name || "Anonim"}
                                            </p>
                                            <p className={`text-sm ${textSecondary}`}>{order.profiles?.email}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <div className={`col-span-2 font-medium ${textPrimary}`}>
                                            ₺{order.order_details?.total?.toLocaleString("tr-TR") || 0}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-between">
                                            <span className={`text-[10px] leading-tight ${textSecondary}`}>
                                                {formatDateTime(order.created_at)}
                                            </span>
                                            <ChevronRight className={`w-5 h-5 transition-colors ${isDark ? "text-gray-600 group-hover:text-orange-400" : "text-gray-300 group-hover:text-orange-500"}`} />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}
            </m.div>

            {/* Pagination Info */}
            {!isLoading && orders.length > 0 && (
                <div className={`mt-4 text-center text-sm ${textSecondary}`}>
                    Toplam {totalCount} sipariş gösteriliyor
                </div>
            )}
        </div>
    );
}

export default function AdminOrders() {
    return (
        <AdminGuard>
            <AdminLayout>
                <OrdersContent />
            </AdminLayout>
        </AdminGuard >
    );
}
