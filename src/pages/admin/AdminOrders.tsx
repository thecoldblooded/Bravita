import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, Filter, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getAllOrders, Order, OrderStatus, STATUS_CONFIG } from "@/lib/admin";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/Loader";

export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        async function loadOrders() {
            setIsLoading(true);
            try {
                const filters: { status?: OrderStatus; search?: string } = {};
                if (statusFilter) filters.status = statusFilter;
                if (search) filters.search = search;

                const data = await getAllOrders(filters);
                setOrders(data.orders);
                setTotalCount(data.count);
            } catch (error) {
                console.error("Failed to load orders:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadOrders();
    }, [search, statusFilter]);

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
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
                        <p className="text-gray-500">Tüm siparişleri görüntüleyin ve yönetin</p>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-4">
                        <div className="flex-1 min-w-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Sipariş ID veya müşteri ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
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

                    {/* Orders Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader />
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
                                    <div className="col-span-2">Tutar</div>
                                    <div className="col-span-2">Tarih</div>
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
                                                    <span className="text-gray-500">
                                                        {new Date(order.created_at).toLocaleDateString("tr-TR")}
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
        </AdminGuard>
    );
}
