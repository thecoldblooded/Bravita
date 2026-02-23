import { useEffect, useState } from "react";
import { MapPin, CreditCard, Building2, Package, X, Loader2 } from "lucide-react";
import { supabase, UserProfile } from "@/lib/supabase";
import bravitaBottle from "@/assets/bravita-bottle.webp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation, Trans } from "react-i18next";
import { SalesAgreements } from "./SalesAgreements";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { validatePromoCode } from "@/lib/checkout";

interface CartItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    product_id?: string;
}

interface Totals {
    subtotal: number;
    vat: number;
    total: number;
    discount: number;
    shipping: number;
}

interface Address {
    id: string;
    street: string;
    city: string;
    postal_code: string;
    district?: string;
}

interface OrderSummaryProps {
    addressId: string | null;
    paymentMethod: "credit_card" | "bank_transfer";
    installmentNumber: number;
    installmentRates: Array<{
        installment_number: number;
        commission_rate: number;
        is_active: boolean;
    }>;
    items: CartItem[];
    totals: Totals;
    user: UserProfile | null;
    isAgreed: boolean;
    onAgreementChange: (val: boolean) => void;
}

export function OrderSummary({
    addressId,
    paymentMethod,
    installmentNumber,
    installmentRates,
    items,
    totals,
    user,
    isAgreed,
    onAgreementChange,
}: OrderSummaryProps) {
    const { t } = useTranslation();
    const [address, setAddress] = useState<Address | null>(null);
    const { applyPromoCode, removePromoCode, promoCode, settings } = useCart();

    // Local input state
    const [inputPromoCode, setInputPromoCode] = useState(promoCode || "");
    const [prevPromoCode, setPrevPromoCode] = useState(promoCode);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    // Brute force protection state
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<number | null>(null);
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_TIME = 10 * 60 * 1000; // 10 minutes
    const commissionRate = paymentMethod === "credit_card"
        ? (installmentRates.find((rate) => rate.installment_number === installmentNumber)?.commission_rate ?? 0)
        : 0;
    const baseForCommission = Number((totals.subtotal + totals.vat + totals.shipping - totals.discount).toFixed(2));
    const commissionAmount = paymentMethod === "credit_card"
        ? Number(((baseForCommission * commissionRate) / 100).toFixed(2))
        : 0;
    const payableTotal = Number((baseForCommission + commissionAmount).toFixed(2));

    if (promoCode !== prevPromoCode) {
        setPrevPromoCode(promoCode);
        setInputPromoCode(promoCode || "");
    }

    useEffect(() => {
        async function fetchAddress() {
            if (!addressId) return;


            try {
                const { data } = await supabase
                    .from("addresses")
                    .select("*")
                    .eq("id", addressId)
                    .single();
                setAddress(data);
            } catch (err) {
                console.error("Error fetching address:", err);
            }
        }
        fetchAddress();
    }, [addressId]);


    const handleApplyPromo = async () => {
        if (!inputPromoCode.trim()) return;

        // 1. Brute Force Protection
        if (failedAttempts >= MAX_ATTEMPTS && lastAttemptTimestamp) {
            const timePassed = Date.now() - lastAttemptTimestamp;
            if (timePassed < LOCKOUT_TIME) {
                const remainingMinutes = Math.ceil((LOCKOUT_TIME - timePassed) / 60000);
                toast.error(t("checkout.validation.too_many_attempts", "Çok fazla hatalı deneme. Lütfen {{minutes}} dakika sonra tekrar deneyin.", { minutes: remainingMinutes }));
                return;
            } else {
                setFailedAttempts(0);
            }
        }

        setIsApplyingPromo(true);
        try {
            const totalOnFullPrice = totals.subtotal * (1 + settings.vat_rate);

            // Validate code
            const result = await validatePromoCode(inputPromoCode, totalOnFullPrice, totals.subtotal);

            if (result.valid) {
                setFailedAttempts(0);
                applyPromoCode(inputPromoCode, result.discountAmount);
                toast.success(result.message);
            } else {
                setFailedAttempts(prev => prev + 1);
                setLastAttemptTimestamp(Date.now());
                toast.error(result.message);
            }

        } catch (error) {
            console.error("Promo code error:", error);
            toast.error(t("errors.unknown", "Bir hata oluştu"));
        } finally {
            setIsApplyingPromo(false);
        }
    };


    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("checkout.summary_title", "Sipariş Özeti")}</h2>
            <p className="text-gray-500 text-sm mb-6">{t("checkout.summary_desc", "Siparişinizi onaylamadan önce kontrol edin.")}</p>

            <div className="space-y-6">
                {/* Products */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900">{t("checkout.products", "Ürünler")}</h3>
                    </div>

                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 border border-orange-100 shadow-sm overflow-hidden">
                                    <img
                                        src={bravitaBottle}
                                        alt={item.name || "Bravita"}
                                        className="w-full h-full object-contain hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-neutral-900 truncate">{item.name || t("cart.item_name", "Bravita Multivitamin")}</h4>
                                    <p className="text-sm font-bold text-neutral-400 mt-0.5">
                                        {t("cart.quantity_label", "Adet")}: {item.quantity}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-neutral-900 block">
                                        ₺{(item.price * item.quantity).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-bold text-neutral-400 block">
                                        ₺{item.price.toFixed(2)} / {t("cart.unit", "birim")}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-4 text-center">
                            <p className="text-sm text-gray-500">{t("cart.empty", "Sepetiniz boş")}</p>
                        </div>
                    )}
                </div>

                {/* Delivery Address */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900">{t("checkout.delivery_address", "Teslimat Adresi")}</h3>
                    </div>

                    {address ? (
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-900">
                                {address.city}{address.district ? ` / ${address.district}` : ""}
                            </p>
                            <p>{address.street}</p>
                            <p>{address.postal_code}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">{t("common.loading", "Adres yükleniyor...")}</p>
                    )}
                </div>

                {/* Payment Method */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        {paymentMethod === "credit_card" ? (
                            <CreditCard className="w-5 h-5 text-orange-500" />
                        ) : (
                            <Building2 className="w-5 h-5 text-orange-500" />
                        )}
                        <h3 className="font-medium text-gray-900">{t("checkout.payment_method", "Ödeme Yöntemi")}</h3>
                    </div>

                    <p className="text-sm text-gray-600">
                        {paymentMethod === "credit_card"
                            ? t("checkout.payment.credit_card", "Kredi Kartı / Banka Kartı")
                            : t("checkout.payment.bank_transfer", "Havale / EFT")}
                    </p>
                    {paymentMethod === "bank_transfer" && (
                        <p className="text-xs text-orange-600 mt-1">
                            {t('checkout.bank_transfer_hint')}
                        </p>
                    )}
                </div>

                {/* Totals & Promo Code */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 space-y-4">
                    {/* Promo Code Input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder={t('checkout.promo_placeholder')}
                            className="bg-white"
                            value={inputPromoCode}
                            onChange={(e) => setInputPromoCode(e.target.value)}
                            // Disable input if a promo is already applied in current session
                            // We can use totals.discount to check if there is a discount
                            disabled={totals.discount > 0}
                        />
                        {totals.discount > 0 ? (
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                    removePromoCode();
                                    setInputPromoCode("");
                                    toast.info(t('checkout.promo_removed'));
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleApplyPromo}
                                disabled={isApplyingPromo || !inputPromoCode.trim()}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isApplyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t("checkout.apply", "Uygula")}
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('cart.subtotal')}</span>
                            <span className="font-medium text-gray-900">₺{totals.subtotal.toFixed(2)}</span>
                        </div>

                        {/* We can show the discount if it exists in totals */}
                        {totals.discount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>{t('cart.discount')} {promoCode ? `(${promoCode})` : ''}</span>
                                <span>-₺{totals.discount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('cart.vat')}</span>
                            <span className="font-medium text-gray-900">₺{totals.vat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">{t('checkout.shipping')}</span>
                            <span className={totals.shipping === 0 ? "font-medium text-green-600" : "font-medium text-gray-900"}>
                                {totals.shipping === 0 ? t('checkout.free') : `₺${totals.shipping.toFixed(2)}`}
                            </span>
                        </div>

                        <div className="h-px bg-orange-200 my-2" />
                        {paymentMethod === "credit_card" && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">
                                    {t("checkout.commission", "Komisyon")} ({installmentNumber === 1 ? t("checkout.payment.single_payment", "Tek çekim") : t("checkout.payment.installment_count", "{{count}} taksit", { count: installmentNumber })} - %{commissionRate.toFixed(2)})
                                </span>
                                <span className="font-medium text-gray-900">₺{commissionAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">{t("checkout.payable_total", "Ödenecek Toplam")}</span>
                            <span className="text-2xl font-black text-orange-600">₺{payableTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <SalesAgreements
                    user={user}
                    address={address}
                    items={items}
                    totals={{ total: payableTotal }}
                    paymentMethod={paymentMethod}
                />

                <div className="flex items-start space-x-2 pt-2 pb-2">
                    <Checkbox
                        id="terms"
                        checked={isAgreed}
                        onCheckedChange={(checked) => onAgreementChange(checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor="terms"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
                        >
                            <Trans
                                i18nKey="checkout.agreements.consent"
                                components={{
                                    1: <span className="font-bold text-gray-900" />,
                                    3: <span className="font-bold text-gray-900" />
                                }}
                            />
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
