import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, MapPin, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import {
    createOrder,
    getInstallmentRates,
    initiateCardPayment,
    tokenizeCardForPayment,
    type InstallmentRate
} from "@/lib/checkout";
import Header from "@/components/Header";

const getSteps = (t: (key: string, options?: Record<string, unknown>) => string) => [
    { id: 1, name: t("checkout.steps.delivery"), icon: MapPin },
    { id: 2, name: t("checkout.steps.payment"), icon: CreditCard },
    { id: 3, name: t("checkout.steps.summary"), icon: Package },
];

const PAYMENT_USE_TOKENIZATION = String(import.meta.env.VITE_PAYMENT_USE_TOKENIZATION ?? "false").toLowerCase() === "true";
const PAYMENT_TOKENIZATION_REQUIRED = String(import.meta.env.VITE_PAYMENT_TOKENIZATION_REQUIRED ?? "false").toLowerCase() === "true";

interface CheckoutData {
    addressId: string | null;
    paymentMethod: "credit_card" | "bank_transfer";
    installmentNumber: number;
    cardDetails?: {
        number: string;
        expiry: string;
        cvv: string;
        name: string;
    };
}

export default function Checkout() {
    const { t } = useTranslation();
    const steps = getSteps(t);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { cartItems, cartTotal, clearCart, promoCode: contextPromoCode } = useCart();
    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutData, setCheckoutData] = useState<CheckoutData>({
        addressId: null,
        paymentMethod: "credit_card",
        installmentNumber: 1,
    });
    const [installmentRates, setInstallmentRates] = useState<InstallmentRate[]>([]);

    const [isAgreed, setIsAgreed] = useState(false);

    // Redirect if not authenticated or cart is empty (but not if order was just placed)
    const [orderPlaced, setOrderPlaced] = useState(false);

    useEffect(() => {
        if (orderPlaced) return; // Don't redirect if order was just placed

        if (!isAuthenticated) {
            toast.error(t("auth.login_required", "Lütfen giriş yapın"));
            navigate("/");
            return;
        }
        if (cartItems.length === 0) {
            toast.error(t("cart.empty", "Sepetiniz boş"));
            navigate("/");
            return;
        }
    }, [isAuthenticated, cartItems, navigate, orderPlaced, t]);

    useEffect(() => {
        async function loadInstallmentRates() {
            const rates = await getInstallmentRates();
            setInstallmentRates(rates);
        }

        loadInstallmentRates();
    }, []);

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return !!checkoutData.addressId;
            case 2:
                if (checkoutData.paymentMethod === "credit_card") {
                    const card = checkoutData.cardDetails;
                    if (!card) return false;

                    const cleanNumber = card.number.replace(/\s/g, "");
                    const isNumberValid = cleanNumber.length === 16;
                    const isExpiryValid = /^(\d{2})\/(\d{2}|\d{4})$/.test(card.expiry.trim()); // MM/YY or MM/YYYY
                    const isCvvValid = card.cvv.length === 3;

                    // Name must contain at least two words (Name + Surname)
                    const nameParts = card.name.trim().split(/\s+/);
                    const isNameValid = nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
                    const isInstallmentValid = checkoutData.installmentNumber >= 1 && checkoutData.installmentNumber <= 12;

                    return isNumberValid && isExpiryValid && isCvvValid && isNameValid && isInstallmentValid;
                }
                return true; // Bank transfer doesn't need card details
            case 3:
                return isAgreed;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handlePlaceOrder = async () => {
        if (!user || !checkoutData.addressId) return;
        if (!isAgreed) {
            toast.error("Lütfen sözleşmeleri onaylayın.");
            return;
        }

        setIsProcessing(true);
        try {
            if (checkoutData.paymentMethod === "credit_card") {
                if (!checkoutData.cardDetails) {
                    toast.error("Kart bilgileri eksik");
                    return;
                }

                let cardToken: string | undefined;
                if (PAYMENT_USE_TOKENIZATION) {
                    const expiryMatch = /^(\d{2})\/(\d{2}|\d{4})$/.exec(checkoutData.cardDetails.expiry.trim());
                    if (!expiryMatch) {
                        toast.error("Kart son kullanma tarihi gecersiz");
                        return;
                    }

                    const expYearRaw = expiryMatch[2];
                    const expYear = expYearRaw.length === 2 ? `20${expYearRaw}` : expYearRaw;
                    const tokenizeResult = await tokenizeCardForPayment({
                        customerCode: user.id,
                        cardHolderFullName: checkoutData.cardDetails.name.trim(),
                        cardNumber: checkoutData.cardDetails.number.replace(/\s/g, ""),
                        expMonth: expiryMatch[1],
                        expYear,
                        cvcNumber: checkoutData.cardDetails.cvv,
                    });

                    if (tokenizeResult.success && tokenizeResult.cardToken) {
                        cardToken = tokenizeResult.cardToken;
                    } else if (PAYMENT_TOKENIZATION_REQUIRED) {
                        toast.error(tokenizeResult.message || "Kart tokenizasyonu basarisiz");
                        return;
                    }
                }

                const cardInitResult = await initiateCardPayment({
                    shippingAddressId: checkoutData.addressId,
                    installmentNumber: checkoutData.installmentNumber,
                    items: cartItems.map((item) => ({
                        product_id: item.product_id || item.id,
                        quantity: item.quantity,
                    })),
                    cardDetails: cardToken ? undefined : checkoutData.cardDetails,
                    cardToken,
                    promoCode: cartTotal.discount > 0 && typeof contextPromoCode === "string" ? contextPromoCode : undefined,
                });

                const threeDPayload = cardInitResult.threeD || (cardInitResult.redirectUrl ? { redirectUrl: cardInitResult.redirectUrl } : undefined);

                if (cardInitResult.success && cardInitResult.intentId && threeDPayload) {
                    sessionStorage.setItem(`threed:${cardInitResult.intentId}`, JSON.stringify(threeDPayload));
                    sessionStorage.setItem("bravita_pending_card_checkout", "1");
                    setCheckoutData((prev) => ({
                        ...prev,
                        cardDetails: {
                            number: "",
                            expiry: "",
                            cvv: "",
                            name: "",
                        },
                    }));
                    navigate(`/3d-redirect?intent=${encodeURIComponent(cardInitResult.intentId)}`);
                    return;
                }

                toast.error(cardInitResult.message || "3D ödeme başlatılamadı");
                return;
            }

            const bankTransferResult = await createOrder({
                userId: user.id,
                items: cartItems,
                shippingAddressId: checkoutData.addressId,
                paymentMethod: "bank_transfer",
                subtotal: cartTotal.subtotal,
                vatAmount: cartTotal.vat,
                total: cartTotal.total,
                promoCode: cartTotal.discount > 0 && typeof contextPromoCode === "string" ? contextPromoCode : undefined,
                discountAmount: cartTotal.discount,
            });

            if (bankTransferResult.success && bankTransferResult.orderId) {
                setOrderPlaced(true);
                toast.success(t("order.success_toast", "Siparişiniz başarıyla oluşturuldu!"));
                navigate(`/order-confirmation/${bankTransferResult.orderId}`);
                setTimeout(() => clearCart(), 100);
            } else {
                toast.error(bankTransferResult.message || t("errors.order_failed", "Sipariş oluşturulamadı"));
            }
        } catch (error) {
            console.error("Order creation error:", error);
            toast.error(t("errors.unknown", "Bir hata oluştu, lütfen tekrar deneyin"));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white">
            <Header />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {/* Progress Line */}
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2" />
                        <div
                            className="absolute left-0 top-1/2 h-0.5 bg-orange-500 -translate-y-1/2 transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / (getSteps(t).length - 1)) * 100}%` }}
                        />

                        {getSteps(t).map((step) => {
                            const Icon = step.icon;
                            const isCompleted = currentStep > step.id;
                            const isCurrent = currentStep === step.id;

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center">
                                    <motion.div
                                        animate={{
                                            scale: isCurrent ? 1.1 : 1,
                                            backgroundColor: isCompleted || isCurrent ? "#f97316" : "#fff",
                                        }}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted || isCurrent
                                            ? "border-orange-500 text-white"
                                            : "border-gray-200 text-gray-400 bg-white"
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </motion.div>
                                    <span className={`mt-2 text-sm font-medium ${isCurrent ? "text-orange-600" : "text-gray-500"
                                        }`}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 md:p-8 min-h-100">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <AddressSelector
                                    selectedAddressId={checkoutData.addressId}
                                    onSelect={(addressId) => setCheckoutData({ ...checkoutData, addressId })}
                                />
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <PaymentMethodSelector
                                    selectedMethod={checkoutData.paymentMethod}
                                    installmentNumber={checkoutData.installmentNumber}
                                    installmentRates={installmentRates}
                                    cardDetails={checkoutData.cardDetails}
                                    onMethodChange={(method) => setCheckoutData({ ...checkoutData, paymentMethod: method })}
                                    onInstallmentChange={(installmentNumber) => setCheckoutData({ ...checkoutData, installmentNumber })}
                                    onCardDetailsChange={(details) => setCheckoutData({ ...checkoutData, cardDetails: details })}
                                />
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <OrderSummary
                                    addressId={checkoutData.addressId}
                                    paymentMethod={checkoutData.paymentMethod}
                                    installmentNumber={checkoutData.installmentNumber}
                                    installmentRates={installmentRates}
                                    items={cartItems}
                                    totals={cartTotal}
                                    user={user}
                                    isAgreed={isAgreed}
                                    onAgreementChange={setIsAgreed}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-6">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="px-6 py-3 rounded-xl border-gray-200"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t("common.back", "Geri")}
                    </Button>

                    {currentStep < 3 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {t("common.next", "İleri")}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePlaceOrder}
                            disabled={isProcessing || !canProceed()}
                            className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    {t("common.processing", "İşleniyor...")}
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    {t("checkout.confirm_order", "Siparişi Onayla")}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
