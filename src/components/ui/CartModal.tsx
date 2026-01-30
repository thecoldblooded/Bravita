import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Trash2, Ticket, Plus, Minus } from "lucide-react";
import { Button } from "./button";
import bravitaBottle from "../../assets/bravita-bottle.webp";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface CartModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CartModal({ open, onOpenChange }: CartModalProps) {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState(1);
    const [promoCode, setPromoCode] = useState("");

    // Updated values based on user request
    const unitPrice = 600;
    const vatRate = 0.20;

    const subtotal = unitPrice * quantity;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    const handleRemove = () => setQuantity(0);
    const increment = () => setQuantity(prev => prev + 1);
    const decrement = () => setQuantity(prev => Math.max(1, prev - 1));

    // Ultra-strict scroll lock for mobile and desktop including Lenis
    useEffect(() => {
        if (!open) return;

        // 1. Handle Lenis (Smooth Scroll)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lenis = (window as any).lenis;
        if (lenis) {
            lenis.stop();
        }

        // 2. Standard Scroll Lock
        const scrollY = window.scrollY;
        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;
        const originalTop = document.body.style.top;
        const originalWidth = document.body.style.width;

        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        // 3. Final barrier against touch bleed
        const preventDefault = (e: TouchEvent) => {
            if (e.touches.length > 1) return;
            const isScrollable = (e.target as HTMLElement).closest('.overflow-y-auto');
            if (!isScrollable) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });

        const handleWheel = (e: WheelEvent) => {
            const isScrollable = (e.target as HTMLElement).closest('.overflow-y-auto');
            if (!isScrollable) {
                e.preventDefault();
            } else {
                e.stopPropagation();
            }
        };

        document.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            // Restore Lenis
            if (lenis) {
                lenis.start();
            }

            // Restore standard scroll
            const savedScrollY = parseInt(document.body.style.top || '0') * -1;
            document.body.style.position = originalPosition;
            document.body.style.top = originalTop;
            document.body.style.width = originalWidth;
            document.body.style.overflow = originalOverflow;

            if (!isNaN(savedScrollY)) {
                window.scrollTo(0, savedScrollY);
            }

            document.removeEventListener('touchmove', preventDefault);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-105 p-0 overflow-hidden bg-white rounded-4xl border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="text-2xl font-black text-neutral-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-orange-600" />
                        </div>
                        {t("cart.title")}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-8 pb-8 pt-4 space-y-6">
                    {/* Cart Item - Animated entry */}
                    <AnimatePresence mode="wait">
                        {quantity > 0 ? (
                            <motion.div
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
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-black text-neutral-900">{quantity}</span>
                                                <button
                                                    onClick={increment}
                                                    className="p-2 hover:bg-neutral-100 text-neutral-600 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleRemove}
                                                className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                                                title={t("cart.remove")}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <span className="font-black text-neutral-900 text-lg">₺{unitPrice * quantity}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty-cart"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 text-center"
                            >
                                <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingCart className="w-10 h-10 text-neutral-200" />
                                </div>
                                <p className="font-bold text-neutral-400">{t("cart.empty")}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="h-px bg-neutral-100/80" />

                    {/* Totals Section */}
                    <div className="space-y-4 bg-neutral-50/50 p-6 rounded-3xl border border-neutral-100">
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-neutral-400">{t("cart.subtotal")}</span>
                            <span className="font-black text-neutral-900">₺{subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-neutral-400">{t("cart.vat")}</span>
                            <span className="font-black text-neutral-900">₺{vatAmount}</span>
                        </div>
                        <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                            <span className="font-black text-neutral-900 text-xl tracking-tight">{t("cart.total")}</span>
                            <span className="font-black text-orange-600 text-3xl">₺{total}</span>
                        </div>
                    </div>

                    {/* Promo Code Input */}
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Ticket className="w-4 h-4 text-neutral-400 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                placeholder={t("cart.promo_code")}
                                className="w-full pl-11 pr-4 h-12 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="h-12 px-6 rounded-2xl border-neutral-200 font-black text-sm hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95"
                        >
                            {t("cart.apply")}
                        </Button>
                    </div>

                    {/* Checkout Button */}
                    <div className="relative group/btn-container">
                        <AnimatePresence>
                            {quantity > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                        opacity: [0.5, 1, 0.5],
                                        scale: [1, 1.02, 1],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute -inset-1 bg-orange-600/20 rounded-3xl blur-xl z-0"
                                />
                            )}
                        </AnimatePresence>

                        <Button
                            disabled={quantity === 0}
                            className={cn(
                                "relative w-full h-16 rounded-[1.25rem] font-black text-lg transition-all duration-500 border-none active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden z-10",
                                quantity > 0
                                    ? "bg-orange-600 hover:bg-orange-700 text-white shadow-[0_10px_30px_rgba(238,64,54,0.25)]"
                                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            )}
                        >
                            {/* Shine Effect */}
                            {quantity > 0 && (
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "200%" }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 3,
                                        ease: "linear",
                                        repeatDelay: 1
                                    }}
                                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] z-10"
                                />
                            )}

                            <span className="relative z-20">{t("cart.checkout")}</span>
                            <div className={cn(
                                "relative z-20 w-8 h-8 rounded-lg flex items-center justify-center transition-transform",
                                quantity > 0 ? "bg-orange-500/50 group-hover/btn-container:translate-x-1" : "bg-neutral-200"
                            )}>
                                <ShoppingCart className="w-4 h-4 text-white" />
                            </div>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
