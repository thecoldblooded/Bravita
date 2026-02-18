import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { m } from "framer-motion";
import { Check, Package, MapPin, CreditCard, Building2, ArrowRight, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderById, getBankDetails } from "@/lib/checkout";
import Loader from "@/components/ui/Loader";
import bravitaBottle from "@/assets/bravita-bottle.webp";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useCart } from "@/contexts/CartContext";
import { Helmet } from "react-helmet-async";

interface OrderDetails {
    items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
        line_total?: number;
    }>;
    subtotal: number;
    vat_amount: number;
    shipping_cost?: number;
    commission_amount?: number;
    installment_number?: number;
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
    shipping_address: {
        street: string;
        city: string;
        postal_code: string;
    } | null;
}

interface BankInfo {
    bankName: string;
    iban: string;
    accountHolder: string;
}

export default function OrderConfirmation() {
    const { t } = useTranslation();
    const { orderId } = useParams<{ orderId: string }>();
    const { clearCart } = useCart();
    const [order, setOrder] = useState<Order | null>(null);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!orderId) return;
            setIsLoading(true);
            const [orderData, bankData] = await Promise.all([
                getOrderById(orderId),
                getBankDetails()
            ]);
            setOrder(orderData as Order);
            setBankInfo(bankData);
            setIsLoading(false);
        }
        fetchData();
    }, [orderId]);

    useEffect(() => {
        if (!order) return;
        const pendingCardCheckout = sessionStorage.getItem("bravita_pending_card_checkout");
        if (pendingCardCheckout === "1") {
            if (order.payment_method === "credit_card") {
                clearCart();
            }
            sessionStorage.removeItem("bravita_pending_card_checkout");
        }
    }, [order, clearCart]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(t("common.copied", "Kopyalandı!"));
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader />
                    <p className="text-gray-500 mt-4">{t("order.loading", "Sipariş yükleniyor...")}</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t("order.not_found", "Sipariş Bulunamadı")}</h2>
                    <p className="text-gray-500 mb-6">{t("order.not_found_desc", "Bu sipariş mevcut değil veya erişim izniniz yok.")}</p>
                    <Link to="/">
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                            {t("order.back_home", "Ana Sayfaya Dön")}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isBankTransfer = order.payment_method === "bank_transfer";

    return (
        <div className="min-h-screen bg-linear-to-b from-green-50/50 to-white">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Success Animation */}
                <m.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </m.div>

                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {isBankTransfer ? t("order.success_title_bank", "Siparişiniz Alındı!") : t("order.success_title", "Siparişiniz Onaylandı!")}
                    </h1>
                    <p className="text-gray-500">
                        {isBankTransfer
                            ? t("order.success_desc_bank", "Havale/EFT ile ödeme bekleniyor.")
                            : t("order.success_desc", "Siparişiniz hazırlanmaya başlandı.")}
                    </p>
                </m.div>

                {/* Order ID */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t("order.number", "Sipariş Numarası")}</p>
                            <p className="font-mono font-bold text-gray-900">{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">{t("order.date", "Tarih")}</p>
                            <p className="font-medium text-gray-900">
                                {formatDate(order.created_at)}
                            </p>
                        </div>
                    </div>
                </m.div>

                {/* Bank Transfer Info */}
                {isBankTransfer && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6"
                    >
                        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {t("order.bank_info", "Havale/EFT Bilgileri")}
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">{t("order.bank_name", "Banka:")}</span>
                                <span className="font-medium text-gray-900">{bankInfo?.bankName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">{t("order.iban", "IBAN:")}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-gray-900">{bankInfo?.iban}</span>
                                    <button
                                        onClick={() => bankInfo && copyToClipboard(bankInfo.iban.replace(/\s/g, ""))}
                                        className="p-1 hover:bg-blue-100 rounded"
                                    >
                                        {copied ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">{t("order.account_holder", "Hesap Sahibi:")}</span>
                                <span className="font-medium text-gray-900">{bankInfo?.accountHolder}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">{t("order.amount", "Tutar:")}</span>
                                <span className="font-bold text-lg text-blue-900">₺{order.order_details.total}</span>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>{t("common.important", "Önemli")}:</strong> {t("order.bank_reference_note", "Açıklama kısmına sipariş numaranızı ({{orderId}}) yazmayı unutmayın.", { orderId: order.id.slice(0, 8).toUpperCase() })}
                            </p>
                        </div>
                    </m.div>
                )}

                {/* Order Details */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                >
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-orange-500" />
                        {t("order.details", "Sipariş Detayları")}
                    </h3>

                    {order.order_details.items.map((item, index) => (
                        <div key={item.product_id || index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center p-2">
                                <img src={bravitaBottle} alt={item.product_name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                                <p className="text-sm text-gray-500">{t("order.quantity_label", "Adet:")} {item.quantity} × ₺{item.unit_price}</p>
                            </div>
                            <span className="font-bold text-gray-900">₺{(item.subtotal ?? item.line_total ?? 0).toFixed(2)}</span>
                        </div>
                    ))}

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("cart.subtotal", "Ara Toplam")}</span>
                            <span className="text-gray-900">₺{order.order_details.subtotal}</span>
                        </div>

                        {(order.order_details.discount || 0) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="font-medium">{t("cart.discount", "İndirim")} {order.order_details.promo_code ? `(${order.order_details.promo_code})` : ''}</span>
                                <span className="font-medium">-₺{order.order_details.discount}</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-500">{t("cart.vat", "KDV (%20)")}</span>
                            <span className="text-gray-900">₺{order.order_details.vat_amount}</span>
                        </div>
                        {(order.order_details.shipping_cost || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t("checkout.shipping", "Kargo")}</span>
                                <span className="text-gray-900">₺{order.order_details.shipping_cost}</span>
                            </div>
                        )}
                        {(order.order_details.commission_amount || 0) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    Komisyon{order.order_details.installment_number ? ` (${order.order_details.installment_number} taksit)` : ""}
                                </span>
                                <span className="text-gray-900">₺{order.order_details.commission_amount}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg">
                            <span className="text-gray-900">{t("cart.total", "Toplam")}</span>
                            <span className="text-orange-600">₺{order.order_details.total}</span>
                        </div>
                    </div>
                </m.div>

                {/* Shipping Address */}
                {order.shipping_address && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                    >
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            {t("checkout.delivery_address", "Teslimat Adresi")}
                        </h3>
                        <p className="font-medium text-gray-900">{order.shipping_address.city}</p>
                        <p className="text-gray-600">{order.shipping_address.street}</p>
                        <p className="text-gray-500 text-sm">{order.shipping_address.postal_code}</p>
                    </m.div>
                )}

                {/* Actions */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-3"
                >
                    <Link to="/profile?tab=orders" className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl py-3 border-gray-200">
                            {t("order.my_orders_btn", "Siparişlerim")}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <Link to="/" className="flex-1">
                        <Button className="w-full rounded-xl py-3 bg-orange-500 hover:bg-orange-600 text-white">
                            {t("order.continue_shopping", "Alışverişe Devam Et")}
                        </Button>
                    </Link>
                </m.div>
            </div>
        </div>
    );
}
