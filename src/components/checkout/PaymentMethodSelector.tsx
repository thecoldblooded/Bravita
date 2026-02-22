import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { CreditCard, Building2, Check, AlertCircle, Lock, Copy, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CardDetails {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
}

interface PaymentMethodSelectorProps {
    selectedMethod: "credit_card" | "bank_transfer";
    installmentNumber: number;
    installmentRates: Array<{
        installment_number: number;
        commission_rate: number;
        is_active: boolean;
    }>;
    cardDetails?: CardDetails;
    onMethodChange: (method: "credit_card" | "bank_transfer") => void;
    onInstallmentChange: (installment: number) => void;
    onCardDetailsChange: (details: CardDetails) => void;
}

const BANK_INFO = {
    bankName: "Türkiye İş Bankası",
    iban: "TR28 0006 4000 0014 3730 2995 49",
    accountHolder: "VALCO İLAÇ ARGE LABORATUVAR HİZMETLERİ VE DANIŞMANLIK LİMİTED ŞİRKETİ",
    referenceNote: "Sipariş numaranızı açıklama kısmına yazınız.",
};

export function PaymentMethodSelector({
    selectedMethod,
    installmentNumber,
    installmentRates,
    cardDetails,
    onMethodChange,
    onInstallmentChange,
    onCardDetailsChange,
}: PaymentMethodSelectorProps) {
    const { t } = useTranslation();
    const [localCardDetails, setLocalCardDetails] = useState<CardDetails>(
        cardDetails || { number: "", expiry: "", cvv: "", name: "" }
    );
    const [copiedItem, setCopiedItem] = useState<string | null>(null);

    const copyToClipboard = (text: string, itemId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(itemId);
        toast.success(t("common.copied", "Kopyalandı!"));
        setTimeout(() => setCopiedItem(null), 2000);
    };

    // Sync from prop if changed (using render-time sync)
    const [prevCardDetails, setPrevCardDetails] = useState(cardDetails);
    if (cardDetails !== prevCardDetails) {
        setPrevCardDetails(cardDetails);
        if (cardDetails) {
            setLocalCardDetails(cardDetails);
        }
    }

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || "";
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(" ") : value;
    };

    const formatExpiry = (value: string) => {
        // Allow both MM/YY and MM/YYYY (Bakiyem docs include 12/2022).
        const digits = value.replace(/\D/g, "").slice(0, 6);
        if (digits.length <= 2) return digits;

        const month = digits.slice(0, 2);
        const year = digits.slice(2);
        return `${month}/${year}`;
    };

    const handleCardChange = (field: keyof CardDetails, value: string) => {
        let formattedValue = value;

        if (field === "number") {
            formattedValue = formatCardNumber(value);
        } else if (field === "expiry") {
            formattedValue = formatExpiry(value);
        } else if (field === "cvv") {
            formattedValue = value.replace(/[^0-9]/g, "").substring(0, 3);
        }

        const updated = { ...localCardDetails, [field]: formattedValue };
        setLocalCardDetails(updated);
        onCardDetailsChange(updated);
    };

    const selectedInstallmentRate = installmentRates.find((rate) => rate.installment_number === installmentNumber)?.commission_rate ?? 0;

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("checkout.payment_method", "Ödeme Yöntemi")}</h2>
            <p className="text-gray-500 text-sm mb-6">{t("checkout.payment_desc", "Ödeme yönteminizi seçin.")}</p>

            <div className="grid gap-4 mb-6">
                {/* Credit Card Option */}
                <m.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onMethodChange("credit_card")}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedMethod === "credit_card"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-100 bg-white hover:border-orange-200"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${selectedMethod === "credit_card"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-500"
                            }`}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{t("checkout.payment.credit_card", "Kredi Kartı / Banka Kartı")}</h3>
                            <p className="text-sm text-gray-500">{t("checkout.payment.credit_card_desc", "3D Secure ile güvenli kart ödemesi")}</p>
                        </div>
                        {selectedMethod === "credit_card" && (
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </m.button>

                {/* Bank Transfer Option */}
                <m.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onMethodChange("bank_transfer")}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedMethod === "bank_transfer"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-100 bg-white hover:border-orange-200"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${selectedMethod === "bank_transfer"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-500"
                            }`}>
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{t("checkout.payment.bank_transfer", "Havale / EFT")}</h3>
                            <p className="text-sm text-gray-500">{t("checkout.payment.bank_transfer_desc", "Banka hesabına havale ile ödeme")}</p>
                        </div>
                        {selectedMethod === "bank_transfer" && (
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </m.button>
            </div>

            {/* Credit Card Form */}
            {selectedMethod === "credit_card" && (
                <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-linear-to-br from-gray-800 to-gray-900 p-6 rounded-2xl text-white overflow-hidden"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">{t("checkout.card.threed_info", "3D doğrulama sonrasi banka ekranina yonlendirilirsiniz.")}</span>
                    </div>

                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <Label htmlFor="cardName" className="text-gray-300">{t("checkout.card.name", "Kart Üzerindeki İsim")}</Label>
                            <Input
                                id="cardName"
                                value={localCardDetails.name}
                                onChange={(e) => handleCardChange("name", e.target.value)}
                                placeholder={t("checkout.card.name_placeholder", "AD SOYAD")}
                                autoComplete="cc-name"
                                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cardNumber" className="text-gray-300">{t("checkout.card.number", "Kart Numarası")}</Label>
                            <Input
                                id="cardNumber"
                                value={localCardDetails.number}
                                onChange={(e) => handleCardChange("number", e.target.value)}
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                autoComplete="cc-number"
                                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono text-lg tracking-wider"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expiry" className="text-gray-300">{t("checkout.card.expiry", "Son Kullanma")}</Label>
                                <Input
                                    id="expiry"
                                    value={localCardDetails.expiry}
                                    onChange={(e) => handleCardChange("expiry", e.target.value)}
                                    placeholder={t("checkout.card.expiry_placeholder")}
                                    maxLength={7}
                                    autoComplete="cc-exp"
                                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cvv" className="text-gray-300">{t("checkout.card.cvv", "CVV")}</Label>
                                <Input
                                    id="cvv"
                                    type="password"
                                    value={localCardDetails.cvv}
                                    onChange={(e) => handleCardChange("cvv", e.target.value)}
                                    placeholder="•••"
                                    maxLength={3}
                                    autoComplete="cc-csc"
                                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-300">{t("checkout.payment.installments_label", "Taksit Seçeneği")}</Label>
                            <Select
                                value={String(installmentNumber)}
                                onValueChange={(value) => onInstallmentChange(Number(value))}
                            >
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                    <SelectValue placeholder={t("checkout.payment.select_installment", "Taksit seçin")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {installmentRates
                                        .filter((rate) => rate.is_active && rate.installment_number >= 1 && rate.installment_number <= 12)
                                        .map((rate) => (
                                            <SelectItem key={rate.installment_number} value={String(rate.installment_number)}>
                                                {rate.installment_number === 1
                                                    ? `${t("checkout.payment.single_payment", "Tek çekim")} (%${rate.commission_rate.toFixed(2)} ${t("checkout.payment.commission_suffix", "komisyon")})`
                                                    : `${t("checkout.payment.installment_count", "{{count}} taksit", { count: rate.installment_number })} (%${rate.commission_rate.toFixed(2)} ${t("checkout.payment.commission_suffix", "komisyon")})`}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400">
                                {t("checkout.payment.commission_applied", "Uygulanan komisyon: %{{rate}}", { rate: selectedInstallmentRate.toFixed(2) })}
                            </p>
                        </div>
                    </form>

                    <div className="flex items-center gap-2 mt-4 justify-center bg-gray-700/50 p-3 rounded-xl border border-gray-600/50">
                        <div className="p-1.5 bg-green-500/10 rounded-full">
                            <Lock className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-300">
                            {t("checkout.payment.secure_payment", "Güvenli Ödeme - 256-bit SSL Korumalı")}
                        </span>
                    </div>
                </m.div>
            )
            }

            {/* Bank Transfer Info */}
            {
                selectedMethod === "bank_transfer" && (
                    <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-blue-50 border border-blue-100 p-6 rounded-2xl overflow-hidden"
                    >
                        <h3 className="font-medium text-blue-900 mb-4">{t("order.bank_info", "Banka Hesap Bilgileri")}</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-600 shrink-0">{t("order.bank_name", "Banka:")}</span>
                                <div className="flex items-center gap-2 justify-end w-full">
                                    <span className="font-medium text-gray-900 text-right">{BANK_INFO.bankName}</span>
                                    <button
                                        onClick={() => copyToClipboard(BANK_INFO.bankName, 'bankName')}
                                        className="p-1 hover:bg-blue-100 rounded shrink-0 transition-colors"
                                        title={t("common.copy", "Kopyala")}
                                    >
                                        {copiedItem === 'bankName' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-600 shrink-0">{t("order.iban", "IBAN:")}</span>
                                <div className="flex items-center gap-2 justify-end w-full">
                                    <span className="font-mono text-gray-900 text-sm md:text-base text-right">{BANK_INFO.iban}</span>
                                    <button
                                        onClick={() => copyToClipboard(BANK_INFO.iban.replace(/\s/g, ""), 'iban')}
                                        className="p-1 hover:bg-blue-100 rounded shrink-0 transition-colors"
                                        title={t("common.copy", "Kopyala")}
                                    >
                                        {copiedItem === 'iban' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-600 shrink-0">{t("order.account_holder", "Hesap Sahibi:")}</span>
                                <div className="flex items-center gap-2 justify-end w-full text-right">
                                    <span className="font-medium text-gray-900 text-xs md:text-sm">{BANK_INFO.accountHolder}</span>
                                    <button
                                        onClick={() => copyToClipboard(BANK_INFO.accountHolder, 'accountHolder')}
                                        className="p-1 hover:bg-blue-100 rounded shrink-0 self-start transition-colors"
                                        title={t("common.copy", "Kopyala")}
                                    >
                                        {copiedItem === 'accountHolder' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-blue-500" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>{t("common.note", "Not")}:</strong> {t("checkout.payment.reference_note", BANK_INFO.referenceNote)}
                            </p>
                        </div>
                    </m.div>
                )
            }
        </div >
    );
}
