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
import { createOrder } from "@/lib/checkout";
import Header from "@/components/Header";

const getSteps = (t: (key: string, options?: Record<string, unknown>) => string) => [
    { id: 1, name: t("checkout.steps.delivery"), icon: MapPin },
    { id: 2, name: t("checkout.steps.payment"), icon: CreditCard },
    { id: 3, name: t("checkout.steps.summary"), icon: Package },
];

interface CheckoutData {
    addressId: string | null;
    paymentMethod: "credit_card" | "bank_transfer";
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
    });

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

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return !!checkoutData.addressId;
            case 2:
                if (checkoutData.paymentMethod === "credit_card") {
                    const card = checkoutData.cardDetails;
                    return card && card.number && card.expiry && card.cvv && card.name;
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
            const result = await createOrder({
                userId: user.id,
                items: cartItems,
                shippingAddressId: checkoutData.addressId,
                paymentMethod: checkoutData.paymentMethod,
                subtotal: cartTotal.subtotal,
                vatAmount: cartTotal.vat,
                total: cartTotal.total,
                promoCode: cartTotal.discount > 0 && typeof contextPromoCode === 'string' ? contextPromoCode : undefined,
                discountAmount: cartTotal.discount,
            });

            if (result.success && result.orderId) {
                setOrderPlaced(true); // Prevent redirect
                toast.success(t("order.success_toast", "Siparişiniz başarıyla oluşturuldu!"));

                // Navigate first, then clear cart
                navigate(`/order-confirmation/${result.orderId}`);

                // Clear cart after navigation (setTimeout to ensure navigation happens first)
                setTimeout(() => {
                    clearCart();
                }, 100);
            } else {
                toast.error(result.message || t("errors.order_failed", "Sipariş oluşturulamadı"));
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
                                    cardDetails={checkoutData.cardDetails}
                                    onMethodChange={(method) => setCheckoutData({ ...checkoutData, paymentMethod: method })}
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
