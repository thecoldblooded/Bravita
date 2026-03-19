import { useEffect, useMemo, useReducer } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { useTranslation } from "react-i18next";
import { PackageX, ShoppingCart, Sparkles } from "lucide-react";
const bravitaGif = "/bravita.gif";
import { Button } from "./button";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CartItem } from "../cart/CartItem";
import { CartSummary } from "../cart/CartSummary";
import { PromoCodeInput } from "../cart/PromoCodeInput";
import { cn } from "@/lib/utils";
import { getProductPrice } from "@/lib/checkout/checkout";
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

    const { data: productData, isLoading, isFetching, isError } = useQuery({
        queryKey: ['productPrice', 'bravita-multivitamin'],
        queryFn: () => getProductPrice("bravita-multivitamin"),
        enabled: open,
        staleTime: 1000 * 60 * 5
    });

    const isPriceLoading = isLoading || (!productData && isFetching);
    const isProductLoadFailed = !isPriceLoading && isError;
    const isProductUnavailable = !isPriceLoading && !isError && !productData;

    const PRICING = useMemo(() => ({
        UNIT_PRICE: productData?.price ?? 0,
        VAT_RATE: settings.vat_rate,
        MAX_QUANTITY: productData?.maxQuantity ?? 0,
        MIN_QUANTITY: 1,
    }), [productData, settings.vat_rate]);

    const currentStock = productData?.stock ?? 0;
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
            const result = await import("@/lib/checkout/checkout").then(m => m.validatePromoCode(inputPromoCode, subtotal, subtotal));
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
        if (!productData || !productId) {
            toast.error(t("cart.catalog_empty_title", "Şu anda aktif ürün bulunmuyor"));
            return;
        }

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
                        ) : isProductLoadFailed ? (
                            <div className="flex h-full flex-col justify-center gap-6 pt-6">
                                <div className="rounded-4xl border border-red-100 bg-red-50/70 p-8 text-center shadow-[0_12px_30px_rgba(239,68,68,0.08)]">
                                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm ring-1 ring-red-100">
                                        <PackageX className="h-7 w-7" />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight text-neutral-900">
                                        {t("cart.catalog_error_title", "Ürün bilgisi şu anda alınamıyor")}
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-neutral-600">
                                        {t("cart.catalog_error_description", "Kısa bir bağlantı sorunu yaşanıyor olabilir. Lütfen birkaç saniye sonra tekrar deneyin.")}
                                    </p>
                                </div>

                                <Button
                                    disabled
                                    className="h-16 rounded-[1.25rem] border-none bg-neutral-100 text-neutral-400 cursor-not-allowed font-black text-lg"
                                >
                                    {t("cart.unavailable_checkout", "Şu anda satın alınamıyor")}
                                </Button>
                            </div>
                        ) : isProductUnavailable ? (
                            <div className="flex h-full flex-col justify-center gap-6 pt-6">
                                <m.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, ease: "easeOut" }}
                                    className="relative overflow-hidden rounded-4xl border border-orange-100 bg-linear-to-br from-orange-50 via-white to-amber-50/80 p-8 text-center shadow-[0_18px_40px_rgba(246,139,40,0.12)]"
                                >
                                    <div className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-orange-300/70 to-transparent" />

                                    <m.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                                        className="mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-[1.75rem] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-orange-100"
                                    >
                                        <PackageX className="h-8 w-8 text-orange-500" />
                                    </m.div>

                                    <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {t("cart.catalog_empty_badge", "Aktif Ürün Yok")}
                                    </div>

                                    <h3 className="text-2xl font-black tracking-tight text-neutral-900">
                                        {t("cart.catalog_empty_title", "Bu ürün şu anda satışta değil")}
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-neutral-600">
                                        {t("cart.catalog_empty_description", "Ürün pasife alınmış veya satıştan kaldırılmış olabilir. Sepetiniz yalnızca aktif ürünlerle devam edecek şekilde güncellendi.")}
                                    </p>

                                    <div className="mt-6 rounded-3xl border border-white/80 bg-white/80 p-4 text-left shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                                                <ShoppingCart className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm font-medium leading-6 text-neutral-600">
                                                {t("cart.catalog_empty_hint", "Aktif ürün tekrar satışa açıldığında sepetten güvenle devam edebilirsiniz. Şimdilik ödeme adımı devre dışı bırakıldı.")}
                                            </p>
                                        </div>
                                    </div>
                                </m.div>

                                <Button
                                    disabled
                                    className="h-16 rounded-[1.25rem] border-none bg-neutral-100 text-neutral-400 cursor-not-allowed font-black text-lg"
                                >
                                    {t("cart.unavailable_checkout", "Şu anda satın alınamıyor")}
                                </Button>
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
