
import { m, AnimatePresence } from "framer-motion";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import bravitaBottle from "@/assets/bravita-bottle.webp";

interface CartItemProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => string;
    quantity: number;
    increment: () => void;
    decrement: () => void;
    serverPrice: number | null;
    serverOriginalPrice: number | null;
}

export const CartItem = ({
    t,
    quantity,
    increment,
    decrement,
    serverPrice,
    serverOriginalPrice
}: CartItemProps) => {
    return (
        <AnimatePresence mode="wait">
            {quantity > 0 ? (
                <m.div
                    key="cart-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-5 group"
                >
                    <div className="w-24 h-28 bg-[#FFF8F1] rounded-3xl flex items-center justify-center p-3 relative overflow-hidden group-hover:scale-105 transition-all duration-500">
                        <div className="absolute inset-0 bg-linear-to-br from-orange-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img
                            src={bravitaBottle}
                            alt="Bravita"
                            className="w-full h-full object-contain drop-shadow-[0_8px_15px_rgba(246,139,40,0.2)] relative z-10"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-neutral-900 text-lg leading-tight">{t("cart.item_name")}</h3>
                                <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-wider">{t("cart.item_desc")}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-neutral-50 rounded-xl border border-neutral-100 overflow-hidden">
                                    <button
                                        onClick={decrement}
                                        disabled={quantity <= 1}
                                        className="p-2 hover:bg-neutral-100 text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label={t("cart.decrease_qty") || "Decrease quantity"}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-black text-neutral-900">{quantity}</span>
                                    <button
                                        onClick={increment}
                                        className="p-2 hover:bg-neutral-100 text-neutral-600 transition-colors"
                                        aria-label={t("cart.increase_qty") || "Increase quantity"}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                {serverOriginalPrice && serverOriginalPrice > (serverPrice ?? 600) && (
                                    <span className="text-xs font-bold text-neutral-400 line-through decoration-current">
                                        ₺{(serverOriginalPrice * quantity).toFixed(2)}
                                    </span>
                                )}
                                <span className="font-black text-neutral-900 text-lg">
                                    ₺{((serverPrice ?? 600) * quantity).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </m.div>
            ) : (
                <m.div
                    key="empty-cart"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center"
                >
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-10 h-10 text-neutral-200" />
                    </div>
                    <p className="font-bold text-neutral-400">{t("cart.empty")}</p>
                </m.div>
            )}
        </AnimatePresence>
    );
};
