import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Package, Search, Filter, ArrowUpDown, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getUserOrders } from "@/lib/checkout";
import Loader from "@/components/ui/Loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { OrderCard } from "@/components/profile/OrderCard";
import { Order } from "@/types/order";

export function OrderHistory() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { openCart } = useCart();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [sortBy, setSortBy] = useState<"created_at" | "total">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Input states (for typing)
    const [minAmountInput, setMinAmountInput] = useState<string>("");
    const [maxAmountInput, setMaxAmountInput] = useState<string>("");

    // Actual filter states (applied on button click)
    const [minAmount, setMinAmount] = useState<string>("");
    const [maxAmount, setMaxAmount] = useState<string>("");
    const retryCountRef = useRef(0);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getUserOrders(user.id, {
                sortBy,
                sortOrder,
                minAmount: minAmount ? parseFloat(minAmount) : undefined,
                maxAmount: maxAmount ? parseFloat(maxAmount) : undefined
            });
            retryCountRef.current = 0; // Reset on success
            setOrders(data as Order[]);
        } catch (err: unknown) {
            if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('AbortError') || err.message?.includes('Aborted'))) {
                console.debug("Order fetch was aborted (expected on navigation)");
                return;
            }
            console.error("Fetch orders error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user, sortBy, sortOrder, minAmount, maxAmount]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMinAmount(minAmountInput);
        setMaxAmount(maxAmountInput);
    };

    const handleClearFilters = () => {
        setMinAmountInput("");
        setMaxAmountInput("");
        setMinAmount("");
        setMaxAmount("");
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
        >
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t("profile.orders.title")}</h2>
                    <p className="text-gray-500 text-sm">{t("profile.orders.description")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={`${sortBy}-${sortOrder}`}
                        onValueChange={(value) => {
                            const [sort, order] = value.split("-") as ["created_at" | "total", "asc" | "desc"];
                            setSortBy(sort);
                            setSortOrder(order);
                        }}
                    >
                        <SelectTrigger className="w-45 h-9 bg-white border-gray-200">
                            <ArrowUpDown className="w-3 h-3 mr-2" />
                            <SelectValue placeholder={t("profile.orders.sort_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at-desc">{t("profile.orders.sort_newest")}</SelectItem>
                            <SelectItem value="created_at-asc">{t("profile.orders.sort_oldest")}</SelectItem>
                            <SelectItem value="total-desc">{t("profile.orders.sort_price_desc")}</SelectItem>
                            <SelectItem value="total-asc">{t("profile.orders.sort_price_asc")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <form onSubmit={handleFilterSubmit} className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder={t("profile.orders.filter_min")}
                            className="w-20 h-9 bg-white"
                            value={minAmountInput}
                            onChange={(e) => setMinAmountInput(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder={t("profile.orders.filter_max")}
                            className="w-20 h-9 bg-white"
                            value={maxAmountInput}
                            onChange={(e) => setMaxAmountInput(e.target.value)}
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-9">
                            <Filter className="w-3 h-3 mr-1" />
                            {t("profile.orders.filter_btn")}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-9 text-gray-500 hover:text-red-500"
                            onClick={handleClearFilters}
                            disabled={!minAmountInput && !maxAmountInput}
                        >
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("profile.orders.filter_clear")}
                        </Button>
                    </form>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t("profile.orders.empty_state")}</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                        {t("profile.orders.empty_state_desc")}
                    </p>
                    <button
                        onClick={openCart}
                        className="px-6 py-2 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
                    >
                        {t("profile.orders.start_shopping")}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            isOpen={selectedOrder?.id === order.id}
                            onToggle={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
