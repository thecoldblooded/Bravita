import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Package, User, MapPin, Clock, Truck, CheckCircle, Edit2, Save, X, ClipboardList } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getOrderById, updateOrderStatus, updateTrackingNumber, getOrderStatusHistory, Order, OrderStatus, STATUS_CONFIG, OrderStatusHistoryItem } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderDetailSkeleton } from "@/components/admin/skeletons";
import { toast } from "sonner";

export default function AdminOrderDetail() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [history, setHistory] = useState<OrderStatusHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
    const [editingTracking, setEditingTracking] = useState(false);
    const [trackingInput, setTrackingInput] = useState("");
    const [shippingCompanyInput, setShippingCompanyInput] = useState("");

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelNote, setCancelNote] = useState("");

    useEffect(() => {
        async function loadOrder() {
            if (!orderId) return;
            try {
                const [orderData, historyData] = await Promise.all([
                    getOrderById(orderId),
                    getOrderStatusHistory(orderId),
                ]);
                setOrder(orderData);
                setHistory(historyData);
                setTrackingInput(orderData?.tracking_number || "");
                setShippingCompanyInput(orderData?.shipping_company || "Yurtiçi Kargo");
            } catch (error) {
                console.error("Failed to load order:", error);
                toast.error("Sipariş yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }
        loadOrder();
    }, [orderId]);

    const handleStatusChange = async (newStatus: OrderStatus, note?: string) => {
        if (!orderId || !order) return;

        // If trying to cancel via timeline button without flow
        if (newStatus === "cancelled" && !note) {
            setShowCancelDialog(true);
            return;
        }

        setIsUpdatingStatus(true);
        try {
            await updateOrderStatus(orderId, newStatus, note);
            setOrder({ ...order, status: newStatus, cancellation_reason: note });
            const newHistory = await getOrderStatusHistory(orderId);
            setHistory(newHistory);
            toast.success("Sipariş durumu güncellendi");
            if (newStatus === "cancelled") {
                setShowCancelDialog(false);
                setCancelNote("");
            }
        } catch (error) {
            console.error("Failed to update status:", error);
            toast.error("Durum güncellenemedi");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleTrackingSave = async () => {
        if (!orderId) return;
        setIsUpdatingTracking(true);
        try {
            await updateTrackingNumber(orderId, trackingInput, shippingCompanyInput);
            setOrder((prev) => prev ? { ...prev, tracking_number: trackingInput, shipping_company: shippingCompanyInput } : null);
            setEditingTracking(false);
            toast.success("Kargo numarası kaydedildi");
        } catch (error) {
            console.error("Failed to update tracking:", error);
            toast.error("Kargo numarası kaydedilemedi");
        } finally {
            setIsUpdatingTracking(false);
        }
    };

    const statusSteps: OrderStatus[] = ["pending", "processing", "preparing", "shipped", "delivered"];

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case "pending": return Clock;
            case "processing": return Package;
            case "preparing": return ClipboardList;
            case "shipped": return Truck;
            case "delivered": return CheckCircle;
            default: return Package;
        }
    };

    if (isLoading) {
        return (
            <AdminGuard>
                <AdminLayout>
                    <div className="max-w-7xl mx-auto">
                        <OrderDetailSkeleton />
                    </div>
                </AdminLayout>
            </AdminGuard>
        );
    }

    if (!order) {
        return (
            <AdminGuard>
                <AdminLayout>
                    <div className="flex flex-col items-center justify-center h-96">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-4">Sipariş bulunamadı</p>
                        <Button onClick={() => navigate("/admin/orders")}>Siparişlere Dön</Button>
                    </div>
                </AdminLayout>
            </AdminGuard>
        );
    }



    const currentStatusIndex = statusSteps.indexOf(order.status as OrderStatus);

    return (
        <AdminGuard>
            <AdminLayout>
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <Link to="/admin/orders" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
                            <ArrowLeft className="w-4 h-4" />
                            Siparişlere Dön
                        </Link>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Sipariş #{order.id.slice(0, 8).toUpperCase()}
                                </h1>
                                <p className="text-gray-500">
                                    {new Date(order.created_at).toLocaleDateString("tr-TR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_CONFIG[order.status as OrderStatus]?.bgColor || "bg-gray-100"} ${STATUS_CONFIG[order.status as OrderStatus]?.color || "text-gray-600"}`}>
                                    {STATUS_CONFIG[order.status as OrderStatus]?.label || order.status}
                                </div>
                                {order.status !== "cancelled" && order.status !== "delivered" && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowCancelDialog(true)}
                                    >
                                        Siparişi İptal Et
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cancellation Dialog */}
                    {showCancelDialog && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Siparişi İptal Et</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve ödeme iade süreci başlatılacaktır.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            İptal Nedeni <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={cancelNote}
                                            onChange={(e) => setCancelNote(e.target.value)}
                                            className="w-full border rounded-md p-2 text-sm min-h-25 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                            placeholder="Müşteri için iptal nedenini açıklayın..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setShowCancelDialog(false);
                                                setCancelNote("");
                                            }}
                                            disabled={isUpdatingStatus}
                                        >
                                            Vazgeç
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleStatusChange("cancelled", cancelNote)}
                                            disabled={isUpdatingStatus || !cancelNote.trim()}
                                        >
                                            {isUpdatingStatus ? "İptal Ediliyor..." : "Siparişi İptal Et"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Timeline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
                    >
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Sipariş Durumu</h2>
                        <div className="flex items-center justify-between relative">
                            {/* Progress Line */}
                            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10" />
                            <div
                                className="absolute top-6 left-0 h-1 bg-orange-500 -z-10 transition-all duration-500"
                                style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                            />

                            {statusSteps.map((status, index) => {
                                const StatusIcon = getStatusIcon(status);
                                const isPast = index <= currentStatusIndex;
                                const isCurrent = index === currentStatusIndex;

                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        disabled={isUpdatingStatus || order.status === "cancelled" || index < currentStatusIndex}
                                        className={`flex flex-col items-center gap-2 relative ${isUpdatingStatus || order.status === "cancelled" || index < currentStatusIndex ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105 transition-transform"
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPast ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"
                                            } ${isCurrent ? "ring-4 ring-orange-200" : ""}`}>
                                            <StatusIcon className="w-6 h-6" />
                                        </div>
                                        <span className={`text-sm font-medium ${isPast ? "text-gray-900" : "text-gray-400"}`}>
                                            {STATUS_CONFIG[status]?.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Order Details */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6"
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-orange-500" />
                                Sipariş Detayları
                            </h2>
                            <div className="space-y-4">
                                {order.order_details?.items?.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.product_name}</p>
                                            <p className="text-sm text-gray-500">{item.quantity} adet × ₺{item.unit_price}</p>
                                        </div>
                                        <p className="font-medium text-gray-900">₺{item.subtotal.toLocaleString("tr-TR")}</p>
                                    </div>
                                ))}
                                <div className="pt-4 space-y-2">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Ara Toplam</span>
                                        <span>₺{order.order_details?.subtotal?.toLocaleString("tr-TR")}</span>
                                    </div>

                                    {order.order_details?.discount && order.order_details.discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>İndirim {order.order_details.promo_code ? `(${order.order_details.promo_code})` : ''}</span>
                                            <span>-₺{order.order_details.discount.toLocaleString("tr-TR")}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-gray-500">
                                        <span>KDV</span>
                                        <span>₺{order.order_details?.vat_amount?.toLocaleString("tr-TR")}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                        <span>Toplam</span>
                                        <span>₺{order.order_details?.total?.toLocaleString("tr-TR")}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Customer & Shipping */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-2xl border border-gray-100 p-6"
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-orange-500" />
                                    Müşteri Bilgileri
                                </h2>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">İsim</p>
                                        <p className="font-medium text-gray-900">{order.profiles?.full_name || "Belirtilmemiş"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">E-posta</p>
                                        <p className="font-medium text-gray-900">{order.profiles?.email || "Belirtilmemiş"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Telefon</p>
                                        <p className="font-medium text-gray-900">{order.profiles?.phone || "Belirtilmemiş"}</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-2xl border border-gray-100 p-6"
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-orange-500" />
                                    Teslimat Adresi
                                </h2>
                                <div className="text-gray-600">
                                    {order.addresses ? (
                                        <>
                                            <p>{order.addresses.street}</p>
                                            <p>{order.addresses.city}, {order.addresses.postal_code}</p>
                                        </>
                                    ) : (
                                        <p className="text-gray-400">Adres bilgisi bulunamadı</p>
                                    )}
                                </div>
                            </motion.div>

                            {/* Tracking Number */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-2xl border border-gray-100 p-6"
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-orange-500" />
                                    Kargo Takip
                                </h2>
                                {editingTracking ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={trackingInput}
                                            onChange={(e) => setTrackingInput(e.target.value)}
                                            placeholder="Kargo takip numarası girin..."
                                            disabled={isUpdatingTracking}
                                        />
                                        <Input
                                            value={shippingCompanyInput}
                                            onChange={(e) => setShippingCompanyInput(e.target.value)}
                                            placeholder="Kargo firması"
                                            className="w-40"
                                            disabled={isUpdatingTracking}
                                        />
                                        <Button
                                            onClick={handleTrackingSave}
                                            disabled={isUpdatingTracking}
                                            className="bg-orange-500 hover:bg-orange-600"
                                        >
                                            <Save className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingTracking(false);
                                                setTrackingInput(order.tracking_number || "");
                                                setShippingCompanyInput(order.shipping_company || "Yurtiçi Kargo");
                                            }}
                                            disabled={isUpdatingTracking}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className={`font-mono ${order.tracking_number ? "text-gray-900" : "text-gray-400"}`}>
                                            {order.tracking_number}
                                            {order.shipping_company && <span className="text-gray-500 text-sm font-sans ml-2">({order.shipping_company})</span>}
                                            {!order.tracking_number && "Henüz girilmedi"}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingTracking(true)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Status History */}
                    {history.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-2xl border border-gray-100 p-6 mt-6"
                        >
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Durum Geçmişi</h2>
                            <div className="space-y-4">
                                {history.map((item, index) => (
                                    <div key={item.id} className="flex items-start gap-4">
                                        <div className="relative">
                                            <div className={`w-3 h-3 rounded-full mt-1.5 ${index === 0 ? "bg-orange-500" : "bg-gray-300"}`} />
                                            {index < history.length - 1 && (
                                                <div className="absolute top-4 left-1 w-0.5 h-8 bg-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {STATUS_CONFIG[item.status as OrderStatus]?.label || item.status}
                                            </p>
                                            {item.note && <p className="text-sm text-gray-500">{item.note}</p>}
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(item.created_at).toLocaleString("tr-TR")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </AdminLayout>
        </AdminGuard>
    );
}
