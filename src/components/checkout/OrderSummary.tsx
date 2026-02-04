import { useEffect, useState } from "react";
import { MapPin, CreditCard, Building2, Package, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import bravitaBottle from "@/assets/bravita-bottle.webp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CartItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

interface Totals {
    subtotal: number;
    vat: number;
    total: number;
    discount?: number;
}

interface Address {
    id: string;
    street: string;
    city: string;
    postal_code: string;
    district?: string; // Added district as it's used in the render
}

interface OrderSummaryProps {
    addressId: string | null;
    paymentMethod: "credit_card" | "bank_transfer";
    items: CartItem[];
    totals: Totals;
}

import { useCart } from "@/contexts/CartContext";
import { validatePromoCode } from "@/lib/checkout";

// ... import interfaces ...

export function OrderSummary({ addressId, paymentMethod, items, totals }: OrderSummaryProps) {
    const [address, setAddress] = useState<Address | null>(null);
    const { applyPromoCode, removePromoCode, promoCode } = useCart();
    // Local input state
    const [inputPromoCode, setInputPromoCode] = useState(promoCode || "");
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    useEffect(() => {
        if (promoCode) setInputPromoCode(promoCode);
    }, [promoCode]);

    useEffect(() => {
        async function fetchAddress() {
            if (!addressId) return;

            // TEST USER BYPASS - Check localStorage first for test user addresses
            const testAddresses = localStorage.getItem("test_user_addresses");
            if (testAddresses) {
                const addresses = JSON.parse(testAddresses);
                const found = addresses.find((a: Address) => a.id === addressId);
                if (found) {
                    setAddress(found);
                    return;
                }
            }
            // END TEST USER BYPASS

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
        setIsApplyingPromo(true);
        try {
            // Validate code
            const result = await validatePromoCode(inputPromoCode, totals.subtotal);

            if (result.valid) {
                applyPromoCode(inputPromoCode, result.discountAmount);
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }

        } catch (error) {
            console.error("Promo code error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setIsApplyingPromo(false);
        }
    };

    // We don't need finalTotal calc anymore, totals.total is already discounted


    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sipariş Özeti</h2>
            <p className="text-gray-500 text-sm mb-6">Siparişinizi onaylamadan önce kontrol edin.</p>

            <div className="space-y-6">
                {/* Products */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900">Ürünler</h3>
                    </div>

                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                            <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center p-2">
                                <img src={bravitaBottle} alt={item.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                            </div>
                            <span className="font-bold text-gray-900">₺{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* Delivery Address */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        <h3 className="font-medium text-gray-900">Teslimat Adresi</h3>
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
                        <p className="text-sm text-gray-500">Adres yükleniyor...</p>
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
                        <h3 className="font-medium text-gray-900">Ödeme Yöntemi</h3>
                    </div>

                    <p className="text-sm text-gray-600">
                        {paymentMethod === "credit_card"
                            ? "Kredi Kartı / Banka Kartı"
                            : "Havale / EFT"}
                    </p>
                    {paymentMethod === "bank_transfer" && (
                        <p className="text-xs text-orange-600 mt-1">
                            * Sipariş onayı sonrası havale bilgileri e-posta ile gönderilecektir.
                        </p>
                    )}
                </div>

                {/* Totals & Promo Code */}
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 space-y-4">
                    {/* Promo Code Input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Promosyon Kodu"
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
                                    toast.info("Promosyon kodu kaldırıldı");
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
                                {isApplyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uygula"}
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Ara Toplam</span>
                            <span className="font-medium text-gray-900">₺{totals.subtotal.toFixed(2)}</span>
                        </div>

                        {/* We can show the discount if it exists in totals */}
                        {totals.discount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>İndirim {promoCode ? `(${promoCode})` : ''}</span>
                                <span>-₺{totals.discount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-600">KDV (%20)</span>
                            <span className="font-medium text-gray-900">₺{totals.vat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Kargo</span>
                            <span className="font-medium text-green-600">Ücretsiz</span>
                        </div>

                        <div className="h-px bg-orange-200 my-2" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">Toplam</span>
                            <span className="text-2xl font-black text-orange-600">₺{totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
