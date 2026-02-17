
import { Ticket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/Loader";

interface PromoCodeInputProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => string;
    inputPromoCode: string;
    setInputPromoCode: (val: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localAppliedPromo: any | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLocalAppliedPromo: (val: any | null) => void;
    handleApplyPromoCode: () => void;
    isApplyingPromo: boolean;
}

export const PromoCodeInput = ({
    t,
    inputPromoCode,
    setInputPromoCode,
    localAppliedPromo,
    setLocalAppliedPromo,
    handleApplyPromoCode,
    isApplyingPromo
}: PromoCodeInputProps) => {
    return (
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
                    // Accessibility improvements
                    aria-label={t("cart.promo_code_label") || "Enter promo code"}
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
                    aria-label={t("cart.remove_promo") || "Remove promo code"}
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
                    aria-label={t("cart.apply_promo") || "Apply promo code"}
                >
                    {isApplyingPromo ? <Loader size="1rem" noMargin /> : t("cart.apply")}
                </Button>
            )}
        </div>
    );
};
