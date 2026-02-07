import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Trash2, Ticket, Plus, Minus } from "lucide-react";
import bravitaGif from "@/assets/bravita.gif";
import { Button } from "./button";
import bravitaBottle from "@/assets/bravita-bottle.webp";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { processCheckout, getProductPrice, checkStock } from "@/lib/checkout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Loader from "@/components/ui/Loader";

interface CartModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CartModal({ open, onOpenChange }: CartModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { addToCart, clearCart, applyPromoCode, removePromoCode, promoCode: contextPromoCode } = useCart();
    const [quantity, setQuantity] = useState(1);
    // const [promoCode, setPromoCode] = useState(""); // Replaced by inputPromoCode and contextPromoCode
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [serverPrice, setServerPrice] = useState<number | null>(null);
    const [serverOriginalPrice, setServerOriginalPrice] = useState<number | null>(null);
    const [maxQuantity, setMaxQuantity] = useState(99);
    const [currentStock, setCurrentStock] = useState(1000);

    const [productId, setProductId] = useState<string | null>(null);

    // SECURITY: Fiyatları SUNUCUDAN al
    useEffect(() => {
        async function fetchPrice() {
            const product = await getProductPrice("bravita-multivitamin");
            if (product) {
                setServerPrice(product.price);
                setServerOriginalPrice(product.original_price || null);
                setMaxQuantity(product.maxQuantity);
                setCurrentStock(product.stock);
                setProductId(product.id);
            }
        }
        if (open) {
            fetchPrice();
        }
    }, [open]);

    // Fallback değerler (sunucudan gelmezse)
    const PRICING = Object.freeze({
        UNIT_PRICE: serverPrice ?? 600,
        VAT_RATE: 0.20,
        MAX_QUANTITY: maxQuantity,
        MIN_QUANTITY: 1,
    });

    // Use context for promo state

    // Local state for input
    const [inputPromoCode, setInputPromoCode] = useState(contextPromoCode || "");
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    // Sync input with context
    useEffect(() => {
        if (contextPromoCode) setInputPromoCode(contextPromoCode);
    }, [contextPromoCode]);

    // Calculate totals using context logic (or just use cartTotal from context!)
    // But since this modal might be used to *manipulate* quantities before committing to "cartTotal" 
    // Wait, useCart's cartTotal is live. 
    // The previous implementation used a local 'quantity' state.
    // The CartModal seems to be designed for a SINGLE item add to cart flow 
    // OR viewing the cart.
    // Looking at the code:
    // It has `const { addToCart, clearCart } = useCart();`
    // It has `const [quantity, setQuantity] = useState(1);`
    // It clears cart and adds item on checkout.
    // This design is... unusual. It treats the modal as a "Quick Buy" for a specific item (Bravita Multivitamin),
    // effectively ignoring whatever was in the cart before?
    // "Clear existing cart and add new item" line 144 confirms this.

    // If the modal is a "Cart View", it should iterate `cartItems`.
    // But lines 202-264 show a SINGLE hardcoded item display (Bravita Bottle).

    // The user issue is "sipariş özetinde [...] görünmüyor".
    // "Sipariş Özeti" is on the Checkout page.

    // If the CartModal is a transient "Quick Buy" window, then persisting to CartContext is exactly what we need
    // so that when we navigate to Checkout (which uses CartContext), the data is there.

    // However, the `subtotal` in CartModal was calculated based on the LOCAL quantity state.
    // `const subtotal = PRICING.UNIT_PRICE * quantity;`

    // When the user clicks "Checkout", we do:
    // clearCart(); addToCart(...); navigate('/checkout');

    // We also need to Apply the promo code to the context AT THAT MOMENT.
    // OR, we can allow applying it in the modal, but since the modal works on *potential* cart items,
    // we should only commit it to context on checkout.

    // BUT the user wants to see the discount IN THE MODAL too.

    // Let's modify the modal to keep using local state for display, but commit to context on checkout.

    const [localAppliedPromo, setLocalAppliedPromo] = useState<{
        code: string;
        type: 'percentage' | 'fixed_amount';
        value: number;
        minOrderAmount: number;
        maxDiscountAmount: number | null;
    } | null>(null);

    // Brute force protection state
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<number | null>(null);
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_TIME = 10 * 60 * 1000; // 10 minutes

    const subtotal = PRICING.UNIT_PRICE * quantity;
    const vatAmountBeforeDiscount = subtotal * PRICING.VAT_RATE;
    const totalBeforeDiscount = subtotal + vatAmountBeforeDiscount;

    // Recalculate discount dynamically based on Total
    const discountAmount = useMemo(() => {
        if (!localAppliedPromo) return 0;

        let calculated = localAppliedPromo.value;
        if (localAppliedPromo.type === 'percentage') {
            calculated = (totalBeforeDiscount * localAppliedPromo.value) / 100;
            // Apply maximum discount cap
            if (localAppliedPromo.maxDiscountAmount && calculated > localAppliedPromo.maxDiscountAmount) {
                calculated = localAppliedPromo.maxDiscountAmount;
            }
        }
        return calculated;
    }, [localAppliedPromo, totalBeforeDiscount]);

    // Validation Effect: Monitor subtotal and auto-remove promo if threshold not met
    useEffect(() => {
        if (localAppliedPromo && subtotal < localAppliedPromo.minOrderAmount) {
            setLocalAppliedPromo(null);
            toast.error(t("promo.invalid_threshold", {
                defaultValue: "Sepet tutarı minimum limitin altına düştüğü için kupon kaldırıldı.",
                amount: localAppliedPromo.minOrderAmount
            }));
        }
    }, [subtotal, localAppliedPromo, t]);

    // Shipping Calculation
    const SHIPPING_COST = 49.90;
    const FREE_SHIPPING_THRESHOLD = 1500;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

    const total = Math.max(0, totalBeforeDiscount - discountAmount + shipping);
    const vatAmount = vatAmountBeforeDiscount; // Fixed VAT on full amount

    const handleRemove = () => {
        setQuantity(0);
        setLocalAppliedPromo(null);
    };
    const increment = () => setQuantity(prev => Math.min(Math.min(PRICING.MAX_QUANTITY, currentStock), prev + 1));
    const decrement = () => setQuantity(prev => Math.max(PRICING.MIN_QUANTITY, prev - 1));

    // SECURITY: Sanitize promo code input to prevent injection
    const handlePromoCodeChange = (value: string) => {
        const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
        setInputPromoCode(sanitized);
    };

    const handleApplyPromoCode = async () => {
        if (!inputPromoCode.trim()) return;

        // 1. Brute Force Protection
        if (failedAttempts >= MAX_ATTEMPTS && lastAttemptTimestamp) {
            const timePassed = Date.now() - lastAttemptTimestamp;
            if (timePassed < LOCKOUT_TIME) {
                const remainingMinutes = Math.ceil((LOCKOUT_TIME - timePassed) / 60000);
                toast.error(`Çok fazla hatalı deneme. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`);
                return;
            } else {
                // Reset after lockout
                setFailedAttempts(0);
            }
        }

        setIsApplyingPromo(true);
        try {
            const result = await import("@/lib/checkout").then(m => m.validatePromoCode(inputPromoCode, subtotal, subtotal));

            if (result.valid) {
                // Success: Reset failed attempts
                setFailedAttempts(0);
                setLocalAppliedPromo({
                    code: inputPromoCode,
                    type: result.type as 'percentage' | 'fixed_amount',
                    value: result.value || 0,
                    minOrderAmount: result.minOrderAmount || 0,
                    maxDiscountAmount: result.maxDiscountAmount ?? null
                });
                toast.success(result.message);
            } else {
                // Failure: Increment brute force counter
                setFailedAttempts(prev => prev + 1);
                setLastAttemptTimestamp(Date.now());
                setLocalAppliedPromo(null);
                toast.error(result.message);
            }
        } catch (error) {
            console.error("Promo code error:", error);
            toast.error("Hata oluştu");
        } finally {
            setIsApplyingPromo(false);
        }
    };

    // SECURITY: Server-side validated checkout
    const handleCheckout = async () => {
        if (!isAuthenticated) {
            toast.error(t("cart.login_required") || "Lütfen giriş yapın");
            onOpenChange(false);
            return;
        }

        // Profile completion check (frontend hint, server will verify too)
        if (user && !user.profile_complete) {
            toast.error(t("cart.profile_incomplete") || "Lütfen önce profilinizi tamamlayın");
            onOpenChange(false);
            navigate("/complete-profile");
            return;
        }

        setIsCheckingOut(true);

        try {
            // NOTE: Stock check temporarily disabled until products table is set up in Supabase
            // const stockCheck = await checkStock("bravita-multivitamin", quantity);
            // if (!stockCheck.available) {
            //     toast.error(stockCheck.message || "Stok yetersiz");
            //     setIsCheckingOut(false);
            //     return;
            // }

            // 1. Clear Cart
            clearCart();

            // 2. Add Item
            addToCart({
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: quantity,
                price: serverPrice ?? 600,
                product_id: productId || undefined,
            });

            // 3. Apply Promo to Context if exists
            if (localAppliedPromo) {
                applyPromoCode(localAppliedPromo.code, discountAmount);
            } else {
                removePromoCode();
            }

            onOpenChange(false);
            navigate("/checkout");
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setIsCheckingOut(false);
        }
    };

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
                                            {/* Delete button removed as per user request */}
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
                            <span className="font-black text-neutral-900">₺{subtotal.toFixed(2)}</span>
                        </div>

                        {localAppliedPromo && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span className="font-bold">İndirim ({localAppliedPromo.code})</span>
                                <span className="font-black">-₺{discountAmount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-neutral-400">{t("cart.vat")}</span>
                            <span className="font-black text-neutral-900">₺{vatAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-neutral-400">{t("checkout.shipping")}</span>
                            <span className={shipping === 0 ? "font-black text-green-600" : "font-black text-neutral-900"}>
                                {shipping === 0 ? t("checkout.free") : `₺${shipping.toFixed(2)}`}
                            </span>
                        </div>

                        {remainingForFreeShipping > 0 && (
                            <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-xs font-bold text-center border border-orange-100">
                                {t('cart.free_shipping_remaining', { amount: remainingForFreeShipping.toFixed(2) })}
                            </div>
                        )}

                        <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                            <span className="font-black text-neutral-900 text-xl tracking-tight">{t("cart.total")}</span>
                            <span className="font-black text-orange-600 text-3xl">₺{total.toFixed(2)}</span>
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
                                value={inputPromoCode}
                                onChange={(e) => {
                                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
                                    setInputPromoCode(sanitized);
                                }}
                                placeholder={t("cart.promo_code")}
                                disabled={!!localAppliedPromo}
                                className="w-full pl-11 pr-4 h-12 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all disabled:opacity-50"
                            />
                        </div>
                        {localAppliedPromo ? (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setLocalAppliedPromo(null);
                                    setInputPromoCode("");
                                }}
                                className="h-12 px-6 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-black text-sm transition-all"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Kaldır
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleApplyPromoCode}
                                disabled={isApplyingPromo || !inputPromoCode}
                                className="h-12 px-6 rounded-2xl border-neutral-200 font-black text-sm hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95"
                            >
                                {isApplyingPromo ? <Loader size="1rem" noMargin /> : t("cart.apply")}
                            </Button>
                        )}
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
                            disabled={quantity === 0 || isCheckingOut}
                            onClick={handleCheckout}
                            className={cn(
                                "relative w-full h-16 rounded-[1.25rem] font-black text-lg transition-all duration-500 border-none active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden z-10",
                                quantity > 0 && !isCheckingOut
                                    ? "bg-orange-600 hover:bg-orange-700 text-white shadow-[0_10px_30px_rgba(238,64,54,0.25)]"
                                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            )}
                        >
                            {/* Shine Effect */}
                            {quantity > 0 && !isCheckingOut && (
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

                            {isCheckingOut ? (
                                <>
                                    <img src={bravitaGif} alt="Loading" className="w-6 h-6" />
                                    <span className="relative z-20">İşleniyor...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-20">{t("cart.checkout")}</span>
                                    <div className={cn(
                                        "relative z-20 w-8 h-8 rounded-lg flex items-center justify-center transition-transform",
                                        quantity > 0 ? "bg-orange-500/50 group-hover/btn-container:translate-x-1" : "bg-neutral-200"
                                    )}>
                                        <ShoppingCart className="w-4 h-4 text-white" />
                                    </div>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
