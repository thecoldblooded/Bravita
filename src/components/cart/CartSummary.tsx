
interface PromoCodeDetails {
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
}

interface CartSummaryProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => string;
    subtotal: number;
    localAppliedPromo: PromoCodeDetails | null;
    discountAmount: number;
    vatAmount: number;
    shipping: number;
    total: number;
    remainingForFreeShipping: number;
}

export const CartSummary = ({
    t,
    subtotal,
    localAppliedPromo,
    discountAmount,
    vatAmount,
    shipping,
    total,
    remainingForFreeShipping
}: CartSummaryProps) => {
    return (
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
    );
};
