import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Package, Search, Filter, ChevronRight, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getAllOrders, Order, OrderStatus, STATUS_CONFIG } from "@/lib/admin";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState<"created_at" | "total">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
                search: searchVal || undefined,
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
    }, [statusFilter, sortBy, sortOrder]);

    // Auto-load on status/sort change (Tabs usually expect immediate feedback)
    useEffect(() => {
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
    }, [loadOrders]);

    const handleClearFilters = () => {
        if (searchRef.current) searchRef.current.value = "";
        if (startDateRef.current) startDateRef.current.value = "";
        if (endDateRef.current) endDateRef.current.value = "";
        if (minAmountRef.current) minAmountRef.current.value = "";
        if (maxAmountRef.current) maxAmountRef.current.value = "";
        setStatusFilter("");
        loadOrders();
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

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
                            <p className="text-gray-500">Tüm siparişleri görüntüleyin ve yönetin</p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadOrders}
                            title="Listeyi Yenile"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                        <div className="flex flex-wrap gap-4 mb-4">
                            <div className="flex-1 min-w-62.5">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        ref={searchRef}
                                        placeholder="Sipariş ID veya müşteri ara..."
                                        className="pl-10"
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
                                        className={statusFilter === option.value ? "bg-orange-500 hover:bg-orange-600" : ""}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Tarih:</span>
                                <Input
                                    ref={startDateRef}
                                    type="date"
                                    className="w-36 h-9"
                                />
                                <span className="text-gray-400">-</span>
                                <Input
                                    ref={endDateRef}
                                    type="date"
                                    className="w-36 h-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 ml-2">Tutar:</span>
                                <Input
                                    ref={minAmountRef}
                                    type="number"
                                    placeholder="Min"
                                    className="w-24 h-9"
                                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && loadOrders()}
                                />
                                <Input
                                    ref={maxAmountRef}
                                    type="number"
                                    placeholder="Max"
                                    className="w-24 h-9"
                                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && loadOrders()}
                                />
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-gray-500 hover:text-red-600"
                                >
                                    Filtreleri Temizle
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={loadOrders}
                                    className="bg-gray-900 hover:bg-gray-800 text-white"
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    Filtrele
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="divide-y divide-gray-100">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-4 px-6 py-5">
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
                                <Package className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500">Sipariş bulunamadı</p>
                            </div>
                        ) : (
                            <>
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                                    <div className="col-span-3">Sipariş</div>
                                    <div className="col-span-3">Müşteri</div>
                                    <div className="col-span-2">Durum</div>
                                    <div
                                        className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-900"
                                        onClick={() => {
                                            if (sortBy === "total") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            else { setSortBy("total"); setSortOrder("desc"); }
                                        }}
                                    >
                                        Tutar {sortBy === "total" && (sortOrder === "asc" ? "↑" : "↓")}
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                    <div
                                        className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-900"
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
                                <div className="divide-y divide-gray-50">
                                    {orders.map((order) => {
                                        const statusConfig = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;

                                        return (
                                            <Link
                                                key={order.id}
                                                to={`/admin/orders/${order.id}`}
                                                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center group"
                                            >
                                                <div className="col-span-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-orange-600" />
                                                    </div>
                                                    <span className="font-mono font-medium text-gray-900">
                                                        #{order.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="col-span-3">
                                                    <p className="font-medium text-gray-900">
                                                        {order.profiles?.full_name || "Anonim"}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{order.profiles?.email}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 font-medium text-gray-900">
                                                    ₺{order.order_details?.total?.toLocaleString("tr-TR") || 0}
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500 leading-tight">
                                                        {formatDateTime(order.created_at)}
                                                    </span>
                                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </motion.div>

                    {/* Pagination Info */}
                    {!isLoading && orders.length > 0 && (
                        <div className="mt-4 text-center text-sm text-gray-500">
                            Toplam {totalCount} sipariş gösteriliyor
                        </div>
                    )}
                </div>
            </AdminLayout>
        </AdminGuard >
    );
}
