import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, ChevronRight, Truck, CheckCircle, CreditCard, Building2, ClipboardList, XCircle, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Order } from "@/types/order";

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
    pending: { labelKey: "profile.orders.status.pending", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-4 h-4" /> },
    processing: { labelKey: "profile.orders.status.processing", color: "bg-blue-100 text-blue-700", icon: <Package className="w-4 h-4" /> },
    preparing: { labelKey: "profile.orders.status.preparing", color: "bg-indigo-100 text-indigo-700", icon: <ClipboardList className="w-4 h-4" /> },
    shipped: { labelKey: "profile.orders.status.shipped", color: "bg-orange-100 text-orange-700", icon: <Truck className="w-4 h-4" /> },
    delivered: { labelKey: "profile.orders.status.delivered", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { labelKey: "profile.orders.status.cancelled", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4" /> },
};

interface OrderCardProps {
    order: Order;
    isOpen: boolean;
    onToggle: () => void;
}

export function OrderCard({ order, isOpen, onToggle }: OrderCardProps) {
    const { t } = useTranslation();
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const itemCount = order.order_details.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <motion.div
            layout
            className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-orange-100/50 transition-all cursor-pointer"
            onClick={onToggle}
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
                                {t(statusConfig.labelKey)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {formatDateTime(order.created_at)} • {itemCount} {t("profile.orders.item_count")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-bold text-gray-900">₺{order.order_details.total}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                            {order.payment_method === "credit_card" ? (
                                <><CreditCard className="w-3 h-3" /> {t("checkout.payment.credit_card_short") || "Kart"}</>
                            ) : (
                                <><Building2 className="w-3 h-3" /> {t("checkout.payment.bank_transfer_short") || "Havale"}</>
                            )}
                        </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            {order.status === "cancelled" && (
                                <div className="bg-red-50 p-4 rounded-xl mb-4 border border-red-100">
                                    <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" /> {t("profile.orders.cancellation_info")}
                                    </h4>
                                    <div className="mt-2 space-y-1">
                                        <span className="opacity-75 block mb-1">{t("profile.orders.cancellation_reason")}</span>
                                        <p className="font-medium">
                                            {order.cancellation_reason || t("profile.orders.unspecified")}
                                        </p>
                                        {order.payment_status === 'refunded' && (
                                            <div className="flex items-center gap-1.5 text-[10px] mt-2 bg-green-500/10 text-green-600 px-2 py-1 rounded-lg w-fit">
                                                <CheckCircle className="w-3 h-3" /> {t("profile.orders.refund_done")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(order.status === "shipped" || order.status === "delivered") && order.tracking_number && (
                                <div className="bg-orange-50 p-4 rounded-xl mb-4 border border-orange-100">
                                    <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                        <Truck className="w-4 h-4" /> {t("profile.orders.tracking_title")}
                                    </h4>
                                    <div className="grid gap-1">
                                        <div className="text-sm text-orange-800 flex justify-between">
                                            <span className="opacity-75">{t("profile.orders.shipping_company")}:</span>
                                            <span className="font-medium">{order.shipping_company || "Yurtiçi Kargo"}</span>
                                        </div>
                                        <div className="text-sm text-orange-800 flex justify-between">
                                            <span className="opacity-75">{t("profile.orders.tracking_no")}:</span>
                                            <span className="font-mono font-medium">{order.tracking_number}</span>
                                        </div>
                                        {order.tracking_number && (
                                            <div className="mt-3">
                                                {(!order.shipping_company || order.shipping_company.toLowerCase().includes("yurtiçi") || order.shipping_company.toLowerCase().includes("yurtici")) ? (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600 shadow-sm"
                                                    >
                                                        <a
                                                            href={`https://selfservis.yurticikargo.com/reports/tracking.aspx?id=${order.tracking_number}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {t("profile.orders.track_btn_yurtici")} <ChevronRight className="w-3 h-3" />
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-700 text-[10px] leading-tight flex items-start gap-2">
                                                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                        {t("profile.orders.track_external_note")}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <h4 className="text-sm font-medium text-gray-900 mb-3">{t("profile.orders.products")}</h4>
                            {order.order_details.items.map((item) => (
                                <div key={item.product_id} className="flex justify-between text-sm py-2">
                                    <span className="text-gray-600">
                                        {item.product_name} × {item.quantity}
                                    </span>
                                    <span className="font-medium text-gray-900">₺{item.subtotal}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm py-2 border-t border-gray-100 mt-2">
                                <span className="text-gray-500">{t("cart.subtotal")}</span>
                                <span className="text-gray-600">₺{order.order_details.subtotal}</span>
                            </div>

                            {(order.order_details.discount || 0) > 0 && (
                                <div className="flex justify-between text-sm py-2 text-green-600">
                                    <span className="font-medium">{t("cart.discount")} {order.order_details.promo_code ? `(${order.order_details.promo_code})` : ''}</span>
                                    <span className="font-medium">-₺{order.order_details.discount}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm py-2">
                                <span className="text-gray-500">{t("cart.vat")}</span>
                                <span className="text-gray-600">₺{order.order_details.vat_amount}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold">
                                <span className="text-gray-900">{t("cart.total")}</span>
                                <span className="text-orange-600">₺{order.order_details.total}</span>
                            </div>

                            <Link
                                to={`/order-confirmation/${order.id}`}
                                className="mt-4 block w-full text-center py-2 bg-orange-50 text-orange-600 rounded-xl font-medium hover:bg-orange-100 transition-colors"
                            >
                                {t("order.details")}
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

