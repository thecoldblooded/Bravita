import { motion } from "framer-motion";
import { Package, Clock } from "lucide-react";

import { useCart } from "@/contexts/CartContext";

interface Order {
    id: string;
    date: string;
    total: number;
    status: string;
}

export function OrderHistory() {
    const { openCart } = useCart();
    // Placeholder data
    const orders: Order[] = [];

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
                <div className="grid gap-4">
                    {/* Order items would go here */}
                </div>
            )}
        </motion.div>
    );
}
