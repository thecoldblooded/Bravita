import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, ChevronRight, Truck, CheckCircle, CreditCard, Building2, ClipboardList, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getUserOrders } from "@/lib/checkout";
import Loader from "@/components/ui/Loader";
import { Link } from "react-router-dom";

interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface OrderDetails {
    items: OrderItem[];
    subtotal: number;
    vat_amount: number;
    total: number;
    discount?: number;
    promo_code?: string;
}

interface Order {
    id: string;
    status: string;
    payment_method: string;
    payment_status: string;
    order_details: OrderDetails;
    created_at: string;
    tracking_number?: string;
    shipping_company?: string;
    cancellation_reason?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Beklemede", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-4 h-4" /> },
    processing: { label: "İşleniyor", color: "bg-blue-100 text-blue-700", icon: <Package className="w-4 h-4" /> },
    preparing: { label: "Hazırlanıyor", color: "bg-indigo-100 text-indigo-700", icon: <ClipboardList className="w-4 h-4" /> },
    shipped: { label: "Kargoda", color: "bg-orange-100 text-orange-700", icon: <Truck className="w-4 h-4" /> },
    delivered: { label: "Teslim Edildi", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { label: "İptal Edildi", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4" /> },
};

export function OrderHistory() {
    const { user } = useAuth();
    const { openCart } = useCart();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        async function fetchOrders() {
            if (!user) return;
            setIsLoading(true);
            const data = await getUserOrders(user.id);
            setOrders(data as Order[]);
            setIsLoading(false);
        }
        fetchOrders();
    }, [user]);

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl"
            >
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader />
                    <p className="text-gray-500 mt-4">Siparişler yükleniyor...</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Siparişlerim</h2>
                <p className="text-gray-500 text-sm">Geçmiş siparişlerinizi ve durumlarını görüntüleyin.</p>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Siparişiniz Yok</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                        Bravita ürünlerini keşfetmeye başlayın ve ilk siparişinizi oluşturun.
                    </p>
                    <button
                        onClick={openCart}
                        className="px-6 py-2 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
                    >
                        Alışverişe Başla
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const itemCount = order.order_details.items.reduce((sum, item) => sum + item.quantity, 0);

                        return (
                            <motion.div
                                key={order.id}
                                layout
                                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-orange-100/50 transition-all cursor-pointer"
                                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                            <Package className="w-6 h-6 text-orange-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-gray-900">
                                                    #{order.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                                                    {statusConfig.icon}
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {new Date(order.created_at).toLocaleDateString("tr-TR")} • {itemCount} ürün
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">₺{order.order_details.total}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                                {order.payment_method === "credit_card" ? (
                                                    <><CreditCard className="w-3 h-3" /> Kart</>
                                                ) : (
                                                    <><Building2 className="w-3 h-3" /> Havale</>
                                                )}
                                            </p>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${selectedOrder?.id === order.id ? "rotate-90" : ""}`} />
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {selectedOrder?.id === order.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                {/* Cancellation Info */}
                                                {order.status === "cancelled" && (
                                                    <div className="bg-red-50 p-4 rounded-xl mb-4 border border-red-100">
                                                        <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                                            <XCircle className="w-4 h-4" /> İptal Bilgisi
                                                        </h4>
                                                        <div className="text-sm text-red-800">
                                                            <span className="opacity-75 block mb-1">İptal Nedeni:</span>
                                                            <p className="font-medium bg-white/50 p-2 rounded border border-red-100">
                                                                {order.cancellation_reason || "Belirtilmemiş"}
                                                            </p>
                                                            {order.payment_status === "refunded" && (
                                                                <div className="mt-2 text-xs flex items-center gap-1 text-red-700 font-medium">
                                                                    <CheckCircle className="w-3 h-3" /> Ödeme iadesi yapıldı.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tracking Info */}
                                                {(order.status === "shipped" || order.status === "delivered") && order.tracking_number && (
                                                    <div className="bg-orange-50 p-4 rounded-xl mb-4 border border-orange-100">
                                                        <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                                            <Truck className="w-4 h-4" /> Kargo Bilgileri
                                                        </h4>
                                                        <div className="grid gap-1">
                                                            <div className="text-sm text-orange-800 flex justify-between">
                                                                <span className="opacity-75">Kargo Firması:</span>
                                                                <span className="font-medium">{order.shipping_company || "Yurtiçi Kargo"}</span>
                                                            </div>
                                                            <div className="text-sm text-orange-800 flex justify-between">
                                                                <span className="opacity-75">Takip No:</span>
                                                                <span className="font-mono font-medium">{order.tracking_number}</span>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-orange-200/50">
                                                                {(!order.shipping_company || order.shipping_company.toLowerCase().includes("yurtiçi") || order.shipping_company.toLowerCase().includes("yurtici")) ? (
                                                                    <a
                                                                        href={`https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${order.tracking_number}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-orange-600 hover:text-orange-800 underline flex items-center gap-1 justify-end"
                                                                    >
                                                                        Kargo Takip (Yurtiçi) <ChevronRight className="w-3 h-3" />
                                                                    </a>
                                                                ) : (
                                                                    <div className="text-xs text-orange-600 flex items-center gap-1 justify-end opacity-75">
                                                                        Takip için kargo firması sitesini ziyaret ediniz.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <h4 className="text-sm font-medium text-gray-900 mb-3">Ürünler</h4>
                                                {order.order_details.items.map((item, index) => (
                                                    <div key={index} className="flex justify-between text-sm py-2">
                                                        <span className="text-gray-600">
                                                            {item.product_name} × {item.quantity}
                                                        </span>
                                                        <span className="font-medium text-gray-900">₺{item.subtotal}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-sm py-2 border-t border-gray-100 mt-2">
                                                    <span className="text-gray-500">Ara Toplam</span>
                                                    <span className="text-gray-600">₺{order.order_details.subtotal}</span>
                                                </div>

                                                {(order.order_details.discount || 0) > 0 && (
                                                    <div className="flex justify-between text-sm py-2 text-green-600">
                                                        <span className="font-medium">İndirim {order.order_details.promo_code ? `(${order.order_details.promo_code})` : ''}</span>
                                                        <span className="font-medium">-₺{order.order_details.discount}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between text-sm py-2">
                                                    <span className="text-gray-500">KDV (%20)</span>
                                                    <span className="text-gray-600">₺{order.order_details.vat_amount}</span>
                                                </div>
                                                <div className="flex justify-between py-2 font-bold">
                                                    <span className="text-gray-900">Toplam</span>
                                                    <span className="text-orange-600">₺{order.order_details.total}</span>
                                                </div>

                                                <Link
                                                    to={`/order-confirmation/${order.id}`}
                                                    className="mt-4 block w-full text-center py-2 bg-orange-50 text-orange-600 rounded-xl font-medium hover:bg-orange-100 transition-colors"
                                                >
                                                    Detayları Görüntüle
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
