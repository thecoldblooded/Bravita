import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { ArrowLeft, Package, User, MapPin, Clock, Truck, CheckCircle, Edit2, Save, X, ClipboardList, RefreshCw, Building2, CreditCard } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { getOrderById, updateOrderStatus, updateTrackingNumber, getOrderStatusHistory, Order, OrderStatus, STATUS_CONFIG, OrderStatusHistoryItem, confirmPayment, voidCardPayment, refundCardPayment } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderDetailSkeleton } from "@/components/admin/skeletons";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

// Inner component that uses useAdminTheme (must be inside AdminLayout/AdminThemeProvider)
function AdminOrderDetailContent() {
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
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    const { theme } = useAdminTheme();
    const isDark = theme === "dark";

    // Dark mode styles
    const cardClass = isDark
        ? "bg-gray-800 rounded-2xl border border-gray-700 p-6"
        : "bg-white rounded-2xl border border-gray-100 p-6";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
    const textMuted = isDark ? "text-gray-500" : "text-gray-400";
    const borderClass = isDark ? "border-gray-700" : "border-gray-100";
    const inputClass = isDark ? "bg-gray-700 border-gray-600 text-white" : "";
    const dialogBg = isDark ? "bg-gray-800" : "bg-white";

    const loadOrder = useCallback(async () => {
        if (!orderId) return;
        setIsLoading(true);
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
    }, [orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const handleStatusChange = async (newStatus: OrderStatus, note?: string) => {
        if (!orderId || !order) return;

        // Validation: Cannot set to Shipped without tracking number
        if (newStatus === "shipped" && !order.tracking_number) {
            toast.error("Kargoya verildi durumuna geçmek için önce kargo takip numarası girmelisiniz.");
            setEditingTracking(true);
            return;
        }

        // Payment validation: Cannot advance status if payment is not confirmed (for bank transfer)
        if (order.payment_status !== 'paid' && newStatus !== 'pending' && newStatus !== 'cancelled') {
            toast.error("Siparişi işleme almak için önce ödemeyi onaylamalısınız.");
            return;
        }

        // If trying to cancel via timeline button without flow
        if (newStatus === "cancelled" && !note) {
            setShowCancelDialog(true);
            return;
        }

        setIsUpdatingStatus(true);
        try {
            let cardPaymentReversalSucceeded = false;
            const shouldReverseCardPayment =
                newStatus === "cancelled" &&
                order.payment_method === "credit_card" &&
                order.payment_status === "paid";

            if (shouldReverseCardPayment) {
                const shouldAttemptVoidFirst = order.status === "pending";

                if (shouldAttemptVoidFirst) {
                    const voidResult = await voidCardPayment(orderId);
                    if (voidResult.success) {
                        cardPaymentReversalSucceeded = true;
                        toast.success("Kart odemesi void edildi.");
                    } else if (voidResult.pending) {
                        toast.warning(voidResult.message || "Void istegi manuel incelemeye alindi.");
                    } else {
                        const refundFallbackResult = await refundCardPayment(orderId);
                        if (!refundFallbackResult.success && !refundFallbackResult.pending) {
                            toast.error(refundFallbackResult.message || "Kart iade islemi basarisiz");
                            return;
                        }

                        cardPaymentReversalSucceeded = refundFallbackResult.success;
                        if (refundFallbackResult.success) {
                            toast.success("Kart odemesi iade edildi.");
                        } else if (refundFallbackResult.pending) {
                            toast.warning(refundFallbackResult.message || "Refund istegi manuel incelemeye alindi.");
                        }
                    }
                } else {
                    const refundResult = await refundCardPayment(orderId);
                    if (!refundResult.success && !refundResult.pending) {
                        toast.error(refundResult.message || "Kart iade islemi basarisiz");
                        return;
                    }

                    cardPaymentReversalSucceeded = refundResult.success;
                    if (refundResult.success) {
                        toast.success("Kart odemesi iade edildi.");
                    } else if (refundResult.pending) {
                        toast.warning(refundResult.message || "Refund istegi manuel incelemeye alindi.");
                    }
                }
            }

            await updateOrderStatus(orderId, newStatus, note);
            setOrder({
                ...order,
                status: newStatus,
                cancellation_reason: note,
                payment_status: cardPaymentReversalSucceeded ? "refunded" : order.payment_status,
            });
            const newHistory = await getOrderStatusHistory(orderId);
            setHistory(newHistory);

            // Send Email Notification for all status changes
            let emailSent = false;
            if (newStatus !== "pending") {
                try {
                    const { error: emailError } = await supabase.functions.invoke("send-order-email", {
                        body: {
                            order_id: orderId,
                            type: newStatus,
                            tracking_number: order.tracking_number,
                            shipping_company: order.shipping_company,
                            cancellation_reason: note // Include reason for cancellation
                        }
                    });

                    if (emailError) throw emailError;
                    emailSent = true;
                } catch (emailErr) {
                    console.error("Email sending failed:", emailErr);
                    toast.warning("Durum güncellendi ancak e-posta bildirimi gönderilemedi.");
                }
            }

            if (!emailSent) {
                toast.success("Sipariş durumu güncellendi");
            } else {
                const actionMap: Record<string, string> = {
                    processing: 'işleniyor',
                    preparing: 'hazırlanıyor',
                    shipped: 'kargo',
                    delivered: 'teslimat',
                    cancelled: 'iptal'
                };
                const actionText = actionMap[newStatus] || 'bildirim';
                toast.success(`Sipariş durumu güncellendi ve ${actionText} bildirimi gönderildi.`);
            }

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

    const handleConfirmPayment = async () => {
        if (!orderId || !order) return;
        setIsConfirmingPayment(true);
        try {
            await confirmPayment(orderId);
            toast.success("Ödeme onaylandı. Sipariş işleniyor aşamasına geçti.");

            // Trigger confirmation email
            supabase.functions.invoke("send-order-email", {
                body: { order_id: orderId, type: "order_confirmation" }
            }).catch(err => console.error("Payment confirmation email failed:", err));

            await loadOrder();
        } catch (error) {
            console.error("Failed to confirm payment:", error);
            toast.error("Ödeme onaylanamadı.");
        } finally {
            setIsConfirmingPayment(false);
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

    if (isLoading && !order) {
        return (
            <div className="max-w-7xl mx-auto">
                <OrderDetailSkeleton />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Package className={`w-16 h-16 ${textMuted} mb-4`} />
                <p className={`${textSecondary} mb-4`}>Sipariş bulunamadı</p>
                <Button onClick={() => navigate("/admin/orders")}>Siparişlere Dön</Button>
            </div>
        );
    }

    const currentStatusIndex = statusSteps.indexOf(order.status as OrderStatus);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link to="/admin/orders" className={`inline-flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-4`}>
                    <ArrowLeft className="w-4 h-4" />
                    Siparişlere Dön
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>
                            Sipariş #{order.id.slice(0, 8).toUpperCase()}
                        </h1>
                        <p className={textSecondary}>
                            {formatDateTime(order.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadOrder}
                            title="Bilgileri Yenile"
                            className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
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

            {/* Payment Status & Action */}
            {order.payment_method === "bank_transfer" && (
                <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${order.payment_status === 'paid'
                        ? (isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100')
                        : (isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100')
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${order.payment_status === 'paid'
                            ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                            : (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                            }`}>
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`font-bold ${textPrimary}`}>
                                {order.payment_status === 'paid' ? 'Ödeme Alındı' : 'Ödeme Bekleniyor (Havale/EFT)'}
                            </p>
                            <p className={`text-sm ${textSecondary}`}>
                                {order.payment_status === 'paid'
                                    ? 'Bu siparişin ödemesi onaylanmıştır.'
                                    : 'Müşteriden havale/EFT yapması bekleniyor. Lütfen hesabı kontrol edip onaylayın.'}
                            </p>
                        </div>
                    </div>
                    {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                        <Button
                            onClick={handleConfirmPayment}
                            disabled={isConfirmingPayment}
                            className="bg-green-600 hover:bg-green-700 text-white min-w-40"
                        >
                            {isConfirmingPayment ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Ödemeyi Onayla
                        </Button>
                    )}
                </m.div>
            )}

            {/* Credit Card Payment Info (Optional visualization) */}
            {order.payment_method === "credit_card" && (
                <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400'}`}>
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className={`font-bold ${textPrimary}`}>
                            {order.payment_status === "refunded" ? "Kredi Karti Odemesi Iade Edildi" : "Kredi Karti ile Odendi"}
                        </p>
                        <p className={`text-sm ${textSecondary}`}>
                            {order.payment_status === "refunded"
                                ? "Odeme iade sureci tamamlandi."
                                : "Islem otomatik olarak onaylandi."}
                        </p>
                    </div>
                </m.div>
            )}

            {/* Cancellation Dialog */}
            {showCancelDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`${dialogBg} rounded-lg p-6 max-w-md w-full mx-4 shadow-xl`}>
                        <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>Siparişi İptal Et</h3>
                        <p className={`${textSecondary} text-sm mb-4`}>
                            Siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve ödeme iade süreci başlatılacaktır.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className={`text-sm font-medium ${textPrimary} block mb-1`}>
                                    İptal Nedeni <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={cancelNote}
                                    onChange={(e) => setCancelNote(e.target.value)}
                                    className={`w-full border rounded-md p-2 text-sm min-h-25 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${isDark ? "bg-gray-700 border-gray-600 text-white" : ""}`}
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
                                    className={isDark ? "text-gray-300 hover:bg-gray-700" : ""}
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
            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cardClass + " mb-6"}
            >
                <h2 className={`text-lg font-bold ${textPrimary} mb-6`}>Sipariş Durumu</h2>
                <div className="flex items-center justify-between relative mt-4 px-6">
                    {/* Progress Line Container */}
                    <div className="absolute top-6 left-12 right-12 h-1 pointer-events-none">
                        {/* Background Line */}
                        <div className={`absolute inset-0 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-full`} />
                        {/* Active Line */}
                        <m.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                            className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        />
                    </div>

                    {statusSteps.map((status, index) => {
                        const StatusIcon = getStatusIcon(status);
                        const isPast = index <= currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;

                        return (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                disabled={
                                    isUpdatingStatus ||
                                    order.status === "cancelled" ||
                                    index <= currentStatusIndex ||
                                    (order.payment_status !== "paid" && status !== "pending" && status !== "cancelled")
                                }
                                className={`flex flex-col items-center gap-2 relative z-10 ${isCurrent
                                    ? "cursor-default"
                                    : (isUpdatingStatus || order.status === "cancelled" || index < currentStatusIndex || (order.payment_status !== "paid" && status !== "pending" && status !== "cancelled"))
                                        ? "opacity-60 cursor-not-allowed"
                                        : "cursor-pointer hover:scale-105 transition-transform"
                                    }`}
                            >
                                <m.div
                                    animate={isCurrent ? { scale: 1.1 } : { scale: 1 }}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center relative transition-colors duration-300 ${isPast ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]" : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"
                                        } ${isCurrent ? "ring-4 ring-orange-100 dark:ring-orange-500/30" : ""}`}>
                                    {isCurrent && (
                                        <m.div
                                            className="absolute inset-0 rounded-full bg-orange-500"
                                            initial={{ scale: 1, opacity: 0.5 }}
                                            animate={{
                                                scale: [1, 1.8],
                                                opacity: [0.5, 0]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeOut",
                                                repeatDelay: 0.2
                                            }}
                                            style={{ willChange: "transform, opacity" }}
                                        />
                                    )}
                                    <StatusIcon className="w-5 h-5 relative z-10" />
                                </m.div>
                                <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${isPast ? (isDark ? "text-orange-400" : "text-orange-600") : textMuted}`}>
                                    {STATUS_CONFIG[status]?.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </m.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Details */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cardClass}
                >
                    <h2 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                        <Package className="w-5 h-5 text-orange-500" />
                        Sipariş Detayları
                    </h2>
                    <div className="space-y-4">
                        {order.order_details?.items?.map((item, index) => (
                            <div key={item.product_id || index} className={`flex items-center justify-between py-3 border-b ${borderClass} last:border-0`}>
                                <div>
                                    <p className={`font-medium ${textPrimary}`}>{item.product_name}</p>
                                    <p className={`text-sm ${textSecondary}`}>{item.quantity} adet × ₺{item.unit_price}</p>
                                </div>
                                <p className={`font-medium ${textPrimary}`}>₺{item.subtotal.toLocaleString("tr-TR")}</p>
                            </div>
                        ))}
                        <div className="pt-4 space-y-2">
                            <div className={`flex justify-between ${textSecondary}`}>
                                <span>Ara Toplam</span>
                                <span>₺{order.order_details?.subtotal?.toLocaleString("tr-TR")}</span>
                            </div>

                            {order.order_details?.discount ? order.order_details.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>İndirim {order.order_details.promo_code ? `(${order.order_details.promo_code})` : ''}</span>
                                    <span>-₺{order.order_details.discount.toLocaleString("tr-TR")}</span>
                                </div>
                            ) : null}

                            {order.order_details?.shipping_cost !== undefined && (
                                <div className={`flex justify-between ${textSecondary}`}>
                                    <span>Kargo Ücreti</span>
                                    <span>{order.order_details.shipping_cost === 0 ? "Bedava" : `₺${order.order_details.shipping_cost.toLocaleString("tr-TR")}`}</span>
                                </div>
                            )}

                            <div className={`flex justify-between ${textSecondary}`}>
                                <span>KDV</span>
                                <span>₺{order.order_details?.vat_amount?.toLocaleString("tr-TR")}</span>
                            </div>
                            <div className={`flex justify-between text-lg font-bold ${textPrimary} pt-2 border-t ${borderClass}`}>
                                <span>Toplam</span>
                                <span>₺{order.order_details?.total?.toLocaleString("tr-TR")}</span>
                            </div>
                        </div>
                    </div>
                </m.div>

                {/* Customer & Shipping */}
                <div className="space-y-6">
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cardClass}
                    >
                        <h2 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                            <User className="w-5 h-5 text-orange-500" />
                            Müşteri Bilgileri
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className={`text-sm ${textSecondary}`}>İsim</p>
                                <p className={`font-medium ${textPrimary}`}>{order.profiles?.full_name || "Belirtilmemiş"}</p>
                            </div>
                            <div>
                                <p className={`text-sm ${textSecondary}`}>E-posta</p>
                                <p className={`font-medium ${textPrimary}`}>{order.profiles?.email || "Belirtilmemiş"}</p>
                            </div>
                            <div>
                                <p className={`text-sm ${textSecondary}`}>Telefon</p>
                                <p className={`font-medium ${textPrimary}`}>{order.profiles?.phone || "Belirtilmemiş"}</p>
                            </div>
                        </div>
                    </m.div>

                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={cardClass}
                    >
                        <h2 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                            <MapPin className="w-5 h-5 text-orange-500" />
                            Teslimat Adresi
                        </h2>
                        <div className={isDark ? "text-gray-300" : "text-gray-600"}>
                            {order.addresses ? (
                                <>
                                    <p>{order.addresses.street}</p>
                                    <p>{order.addresses.city}, {order.addresses.postal_code}</p>
                                </>
                            ) : (
                                <p className={textMuted}>Adres bilgisi bulunamadı</p>
                            )}
                        </div>
                    </m.div>

                    {/* Tracking Number */}
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={cardClass}
                    >
                        <h2 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
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
                                    className={inputClass}
                                />
                                <Input
                                    value={shippingCompanyInput}
                                    onChange={(e) => setShippingCompanyInput(e.target.value)}
                                    placeholder="Kargo firması"
                                    className={`w-40 ${inputClass}`}
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
                                    className={isDark ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : ""}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className={`font-mono ${order.tracking_number ? textPrimary : textMuted}`}>
                                    {order.tracking_number}
                                    {order.shipping_company && <span className={`${textSecondary} text-sm font-sans ml-2`}>({order.shipping_company})</span>}
                                    {!order.tracking_number && "Henüz girilmedi"}
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingTracking(true)}
                                    className={isDark ? "text-gray-300 hover:bg-gray-700" : ""}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </m.div>
                </div>
            </div>

            {/* Status History */}
            {history.length > 0 && (
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={cardClass + " mt-6"}
                >
                    <h2 className={`text-lg font-bold ${textPrimary} mb-4`}>Durum Geçmişi</h2>
                    <div className="space-y-4">
                        {history.map((item, index) => (
                            <div key={item.id} className="flex items-start gap-4">
                                <div className="relative">
                                    <div className={`w-3 h-3 rounded-full mt-1.5 ${index === 0 ? "bg-orange-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`} />
                                    {index < history.length - 1 && (
                                        <div className={`absolute top-4 left-1 w-0.5 h-8 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${textPrimary}`}>
                                        {STATUS_CONFIG[item.status as OrderStatus]?.label || item.status}
                                    </p>
                                    {item.note && <p className={`text-sm ${textSecondary}`}>{item.note}</p>}
                                    <p className={`text-xs ${textMuted} mt-1`}>
                                        {formatDateTime(item.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </m.div>
            )}
        </div>
    );
}

// Wrapper component that provides the AdminThemeProvider via AdminLayout
export default function AdminOrderDetail() {
    return (
        <AdminGuard>
            <AdminLayout>
                <AdminOrderDetailContent />
            </AdminLayout>
        </AdminGuard>
    );
}
