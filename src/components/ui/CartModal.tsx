import { useEffect, useMemo, useReducer } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import bravitaGif from "@/assets/bravita.gif";
import { Button } from "./button";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CartItem } from "../cart/CartItem";
import { CartSummary } from "../cart/CartSummary";
import { PromoCodeInput } from "../cart/PromoCodeInput";
import { cn } from "@/lib/utils";
import { getProductPrice } from "@/lib/checkout";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useScrollLock } from "@/hooks/useScrollLock";

interface CartModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type AppliedPromo = {
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
};

type CartState = {
    quantity: number;
    isCheckingOut: boolean;
    inputPromoCode: string;
    isApplyingPromo: boolean;
    localAppliedPromo: AppliedPromo | null;
    failedAttempts: number;
    lastAttemptTimestamp: number | null;
};

type CartAction =
    | { type: 'SET_QUANTITY'; payload: number }
    | { type: 'SET_CHECKING_OUT'; payload: boolean }
    | { type: 'SET_PROMO_INPUT'; payload: string }
    | { type: 'SET_APPLYING_PROMO'; payload: boolean }
    | { type: 'SET_APPLIED_PROMO'; payload: AppliedPromo | null }
    | { type: 'PROMO_FAILED'; payload: number }
    | { type: 'RESET_FAILED_ATTEMPTS' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
    switch (action.type) {
        case 'SET_QUANTITY': return { ...state, quantity: action.payload };
        case 'SET_CHECKING_OUT': return { ...state, isCheckingOut: action.payload };
        case 'SET_PROMO_INPUT': return { ...state, inputPromoCode: action.payload };
        case 'SET_APPLYING_PROMO': return { ...state, isApplyingPromo: action.payload };
        case 'SET_APPLIED_PROMO': return { ...state, localAppliedPromo: action.payload, failedAttempts: 0, lastAttemptTimestamp: null };
        case 'PROMO_FAILED': return { ...state, failedAttempts: action.payload, lastAttemptTimestamp: Date.now(), localAppliedPromo: null };
        case 'RESET_FAILED_ATTEMPTS': return { ...state, failedAttempts: 0 };
        default: return state;
    }
};

export function CartModal({ open, onOpenChange }: CartModalProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated, refreshUserProfile } = useAuth();
    const { addToCart, clearCart, applyPromoCode, removePromoCode, promoCode: contextPromoCode, settings } = useCart();

    const [state, dispatch] = useReducer(cartReducer, {
        quantity: 1,
        isCheckingOut: false,
        inputPromoCode: contextPromoCode || "",
        isApplyingPromo: false,
        localAppliedPromo: null,
        failedAttempts: 0,
        lastAttemptTimestamp: null,
    });

    const { quantity, isCheckingOut, inputPromoCode, isApplyingPromo, localAppliedPromo, failedAttempts, lastAttemptTimestamp } = state;

    useScrollLock(open);

    const { data: productData, isLoading, isFetching } = useQuery({
        queryKey: ['productPrice', 'bravita-multivitamin'],
        queryFn: () => getProductPrice("bravita-multivitamin"),
        enabled: open,
        staleTime: 1000 * 60 * 5
    });

    const isPriceLoading = isLoading || (!productData && isFetching);

    const PRICING = useMemo(() => ({
        UNIT_PRICE: productData?.price ?? 600,
        VAT_RATE: settings.vat_rate,
        MAX_QUANTITY: productData?.maxQuantity ?? 99,
        MIN_QUANTITY: 1,
    }), [productData, settings.vat_rate]);

    const currentStock = productData?.stock ?? 1000;
    const productId = productData?.id ?? null;

    useEffect(() => {
        if (contextPromoCode) dispatch({ type: 'SET_PROMO_INPUT', payload: contextPromoCode });
    }, [contextPromoCode]);

    const subtotal = PRICING.UNIT_PRICE * quantity;
    const vatAmountBeforeDiscount = subtotal * PRICING.VAT_RATE;
    const totalBeforeDiscount = subtotal + vatAmountBeforeDiscount;

    const discountAmount = useMemo(() => {
        if (!localAppliedPromo) return 0;
        let calculated = localAppliedPromo.value;
        if (localAppliedPromo.type === 'percentage') {
            calculated = (totalBeforeDiscount * localAppliedPromo.value) / 100;
            if (localAppliedPromo.maxDiscountAmount && calculated > localAppliedPromo.maxDiscountAmount) {
                calculated = localAppliedPromo.maxDiscountAmount;
            }
        }
        return calculated;
    }, [localAppliedPromo, totalBeforeDiscount]);

    useEffect(() => {
        if (localAppliedPromo && subtotal < localAppliedPromo.minOrderAmount) {
            dispatch({ type: 'SET_APPLIED_PROMO', payload: null });
            toast.error(t("promo.invalid_threshold", {
                amount: localAppliedPromo.minOrderAmount
            }));
        }
    }, [subtotal, localAppliedPromo, t]);

    const SHIPPING_COST = settings.shipping_cost;
    const FREE_SHIPPING_THRESHOLD = settings.free_shipping_threshold;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
    const total = Math.max(0, totalBeforeDiscount - discountAmount + shipping);

    const increment = () => dispatch({ type: 'SET_QUANTITY', payload: Math.min(Math.min(PRICING.MAX_QUANTITY, currentStock), quantity + 1) });
    const decrement = () => dispatch({ type: 'SET_QUANTITY', payload: Math.max(PRICING.MIN_QUANTITY, quantity - 1) });

    const handleApplyPromoCode = async () => {
        if (!inputPromoCode.trim()) return;

        const MAX_ATTEMPTS = 5;
        const LOCKOUT_TIME = 10 * 60 * 1000;

        if (failedAttempts >= MAX_ATTEMPTS && lastAttemptTimestamp) {
            const timePassed = Date.now() - lastAttemptTimestamp;
            if (timePassed < LOCKOUT_TIME) {
                const remainingMinutes = Math.ceil((LOCKOUT_TIME - timePassed) / 60000);
                toast.error(`${remainingMinutes} dakika sonra tekrar deneyin.`);
                return;
            } else {
                dispatch({ type: 'RESET_FAILED_ATTEMPTS' });
            }
        }

        dispatch({ type: 'SET_APPLYING_PROMO', payload: true });
        try {
            const result = await import("@/lib/checkout").then(m => m.validatePromoCode(inputPromoCode, subtotal, subtotal));
            if (result.valid) {
                dispatch({
                    type: 'SET_APPLIED_PROMO', payload: {
                        code: inputPromoCode,
                        type: result.type as 'percentage' | 'fixed_amount',
                        value: result.value || 0,
                        minOrderAmount: result.minOrderAmount || 0,
                        maxDiscountAmount: result.maxDiscountAmount ?? null
                    }
                });
                toast.success(result.message);
            } else {
                dispatch({ type: 'PROMO_FAILED', payload: failedAttempts + 1 });
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Hata oluştu");
        } finally {
            dispatch({ type: 'SET_APPLYING_PROMO', payload: false });
        }
    };

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            toast.error(t("cart.login_required") || "Lütfen giriş yapın");
            onOpenChange(false);
            return;
        }

        let effectiveUser = user;
        if (effectiveUser?.isStub) {
            effectiveUser = await refreshUserProfile();
        }

        if (effectiveUser && !effectiveUser.isStub && !effectiveUser.profile_complete) {
            toast.error(t("cart.profile_incomplete") || "Lütfen önce profilinizi tamamlayın");
            onOpenChange(false);
            navigate("/complete-profile");
            return;
        }

        dispatch({ type: 'SET_CHECKING_OUT', payload: true });
        try {
            clearCart();
            addToCart({
                name: "Bravita Multivitamin",
                slug: "bravita-multivitamin",
                quantity: quantity,
                price: PRICING.UNIT_PRICE,
                product_id: productId || undefined,
            });

            if (localAppliedPromo) {
                applyPromoCode(localAppliedPromo.code, discountAmount);
            } else {
                removePromoCode();
            }

            onOpenChange(false);
            navigate("/checkout");
        } catch (error) {
            toast.error("Bir hata oluştu");
        } finally {
            dispatch({ type: 'SET_CHECKING_OUT', payload: false });
        }
    };

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
                    <div className="sr-only">
                        <DialogDescription>Sepetinizdeki ürünleri görüntüleyin.</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="px-8 pb-8 pt-4 space-y-6 min-h-100">
                    <LazyMotion features={domAnimation}>
                        {isPriceLoading ? (
                            <div className="flex flex-col items-center justify-center h-full pt-20 pb-10 space-y-4">
                                <m.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.8, 1, 0.8]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <img src={bravitaGif} alt="Loading" className="w-20 h-20" />
                                </m.div>
                                <p className="text-neutral-500 font-medium animate-pulse">{t("common.calculating_price", "Güncel fiyat hesaplanıyor...")}</p>
                            </div>
                        ) : (
                            <>
                                <CartItem
                                    t={t}
                                    quantity={quantity}
                                    increment={increment}
                                    decrement={decrement}
                                    serverPrice={PRICING.UNIT_PRICE}
                                    serverOriginalPrice={productData?.original_price ?? null}
                                />

                                <div className="h-px bg-neutral-100/80" />

                                <CartSummary
                                    t={t}
                                    subtotal={subtotal}
                                    localAppliedPromo={localAppliedPromo}
                                    discountAmount={discountAmount}
                                    vatAmount={vatAmountBeforeDiscount}
                                    shipping={shipping}
                                    total={total}
                                    remainingForFreeShipping={remainingForFreeShipping}
                                />

                                <PromoCodeInput
                                    t={t}
                                    inputPromoCode={inputPromoCode}
                                    setInputPromoCode={(val) => dispatch({ type: 'SET_PROMO_INPUT', payload: val })}
                                    localAppliedPromo={localAppliedPromo}
                                    setLocalAppliedPromo={(val) => dispatch({ type: 'SET_APPLIED_PROMO', payload: val })}
                                    handleApplyPromoCode={handleApplyPromoCode}
                                    isApplyingPromo={isApplyingPromo}
                                />

                                <div className="relative group/btn-container">
                                    <AnimatePresence>
                                        {quantity > 0 && (
                                            <m.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.02, 1] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
                                        {quantity > 0 && !isCheckingOut && (
                                            <m.div
                                                initial={{ x: "-100%" }}
                                                animate={{ x: "200%" }}
                                                transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
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
                            </>
                        )}
                    </LazyMotion>
                </div>
            </DialogContent>
        </Dialog>
    );
}
