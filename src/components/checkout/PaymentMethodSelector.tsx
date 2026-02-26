import { useState } from "react";
import { m } from "framer-motion";
import {
    CreditCard,
    Building2,
    Check,
    AlertCircle,
    Lock,
    Copy,
    CheckCircle,
    type LucideIcon,
} from "lucide-react";
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

type PaymentMethod = PaymentMethodSelectorProps["selectedMethod"];
type InstallmentRate = PaymentMethodSelectorProps["installmentRates"][number];

const BANK_INFO = {
    bankName: "Türkiye İş Bankası",
    iban: "TR28 0006 4000 0014 3730 2995 49",
    accountHolder: "VALCO İLAÇ ARGE LABORATUVAR HİZMETLERİ VE DANIŞMANLIK LİMİTED ŞİRKETİ",
    referenceNote: "Sipariş numaranızı açıklama kısmına yazınız.",
};

const EMPTY_CARD_DETAILS: CardDetails = {
    number: "",
    expiry: "",
    cvv: "",
    name: "",
};

const CREDIT_CARD_METHOD: PaymentMethod = "credit_card";
const BANK_TRANSFER_METHOD: PaymentMethod = "bank_transfer";

interface PaymentMethodOptionProps {
    method: PaymentMethod;
    selectedMethod: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
    icon: LucideIcon;
    title: string;
    description: string;
}

function PaymentMethodOption({
    method,
    selectedMethod,
    onSelect,
    icon: Icon,
    title,
    description,
}: PaymentMethodOptionProps) {
    const isSelected = selectedMethod === method;

    return (
        <m.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect(method)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${isSelected
                ? "border-orange-500 bg-orange-50"
                : "border-gray-100 bg-white hover:border-orange-200"
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isSelected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>
        </m.button>
    );
}

interface InstallmentSelectProps {
    installmentNumber: number;
    installmentRates: InstallmentRate[];
    selectedInstallmentRate: number;
    onInstallmentChange: (installment: number) => void;
}

function InstallmentSelect({
    installmentNumber,
    installmentRates,
    selectedInstallmentRate,
    onInstallmentChange,
}: InstallmentSelectProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-2">
            <Label className="text-gray-300">{t("checkout.payment.installments_label", "Taksit Seçeneği")}</Label>
            <Select value={String(installmentNumber)} onValueChange={(value) => onInstallmentChange(Number(value))}>
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
                                    : `${t("checkout.payment.installment_count", "{{count}} taksit", {
                                        count: rate.installment_number,
                                    })} (%${rate.commission_rate.toFixed(2)} ${t("checkout.payment.commission_suffix", "komisyon")})`}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
                {t("checkout.payment.commission_applied", "Uygulanan komisyon: %{{rate}}", {
                    rate: selectedInstallmentRate.toFixed(2),
                })}
            </p>
        </div>
    );
}

interface CreditCardPanelProps {
    cardDetails: CardDetails;
    installmentNumber: number;
    installmentRates: InstallmentRate[];
    selectedInstallmentRate: number;
    onCardChange: (field: keyof CardDetails, value: string) => void;
    onInstallmentChange: (installment: number) => void;
}

function CreditCardPanel({
    cardDetails,
    installmentNumber,
    installmentRates,
    selectedInstallmentRate,
    onCardChange,
    onInstallmentChange,
}: CreditCardPanelProps) {
    const { t } = useTranslation();

    return (
        <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-linear-to-br from-gray-800 to-gray-900 p-6 rounded-2xl text-white overflow-hidden"
        >
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">
                    {t("checkout.card.threed_info", "3D doğrulama sonrasi banka ekranina yonlendirilirsiniz.")}
                </span>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="cardName" className="text-gray-300">
                        {t("checkout.card.name", "Kart Üzerindeki İsim")}
                    </Label>
                    <Input
                        id="cardName"
                        value={cardDetails.name}
                        onChange={(e) => onCardChange("name", e.target.value)}
                        placeholder={t("checkout.card.name_placeholder", "AD SOYAD")}
                        autoComplete="cc-name"
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 uppercase text-sm md:text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-gray-300">
                        {t("checkout.card.number", "Kart Numarası")}
                    </Label>
                    <Input
                        id="cardNumber"
                        value={cardDetails.number}
                        onChange={(e) => onCardChange("number", e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        autoComplete="cc-number"
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono text-[15px] md:text-lg tracking-wider"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="expiry" className="text-gray-300">
                            {t("checkout.card.expiry", "Son Kullanma")}
                        </Label>
                        <Input
                            id="expiry"
                            value={cardDetails.expiry}
                            onChange={(e) => onCardChange("expiry", e.target.value)}
                            placeholder={t("checkout.card.expiry_placeholder")}
                            maxLength={7}
                            autoComplete="cc-exp"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono text-sm md:text-base"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-gray-300">
                            {t("checkout.card.cvv", "CVV")}
                        </Label>
                        <Input
                            id="cvv"
                            type="password"
                            value={cardDetails.cvv}
                            onChange={(e) => onCardChange("cvv", e.target.value)}
                            placeholder="•••"
                            maxLength={3}
                            autoComplete="cc-csc"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono text-sm md:text-base"
                        />
                    </div>
                </div>

                <InstallmentSelect
                    installmentNumber={installmentNumber}
                    installmentRates={installmentRates}
                    selectedInstallmentRate={selectedInstallmentRate}
                    onInstallmentChange={onInstallmentChange}
                />
            </div>

            <div className="flex items-center gap-2 mt-4 justify-center bg-gray-700/50 p-3 rounded-xl border border-gray-600/50">
                <div className="p-1.5 bg-green-500/10 rounded-full">
                    <Lock className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-300">
                    {t("checkout.payment.secure_payment", "Güvenli Ödeme - 256-bit SSL Korumalı")}
                </span>
            </div>
        </m.div>
    );
}

interface BankInfoRowProps {
    itemId: string;
    label: string;
    value: string;
    isMono?: boolean;
    copiedItem: string | null;
    onCopy: (text: string, itemId: string) => void;
    copyText: string;
    copyPayload?: string;
}

function BankInfoRow({
    itemId,
    label,
    value,
    copiedItem,
    onCopy,
    copyText,
    copyPayload,
    isMono = false,
}: BankInfoRowProps) {
    const isCopied = copiedItem === itemId;

    return (
        <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600 shrink-0">{label}</span>
            <div className="flex items-center gap-2 justify-end w-full text-right">
                <span className={isMono ? "font-mono text-gray-900 text-sm md:text-base" : "font-medium text-gray-900 text-xs md:text-sm"}>
                    {value}
                </span>
                <button
                    onClick={() => onCopy(copyPayload ?? value, itemId)}
                    className="p-1 hover:bg-blue-100 rounded shrink-0 transition-colors"
                    title={copyText}
                >
                    {isCopied ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4 text-blue-500" />
                    )}
                </button>
            </div>
        </div>
    );
}

interface BankTransferPanelProps {
    copiedItem: string | null;
    onCopy: (text: string, itemId: string) => void;
}

function BankTransferPanel({ copiedItem, onCopy }: BankTransferPanelProps) {
    const { t } = useTranslation();

    return (
        <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-100 p-6 rounded-2xl overflow-hidden"
        >
            <h3 className="font-medium text-blue-900 mb-4">{t("order.bank_info", "Banka Hesap Bilgileri")}</h3>

            <div className="space-y-3 text-sm">
                <BankInfoRow
                    itemId="bankName"
                    label={t("order.bank_name", "Banka:")}
                    value={BANK_INFO.bankName}
                    copiedItem={copiedItem}
                    onCopy={onCopy}
                    copyText={t("common.copy", "Kopyala")}
                />
                <BankInfoRow
                    itemId="iban"
                    label={t("order.iban", "IBAN:")}
                    value={BANK_INFO.iban}
                    copiedItem={copiedItem}
                    onCopy={onCopy}
                    copyText={t("common.copy", "Kopyala")}
                    copyPayload={BANK_INFO.iban.replace(/\s/g, "")}
                    isMono
                />
                <BankInfoRow
                    itemId="accountHolder"
                    label={t("order.account_holder", "Hesap Sahibi:")}
                    value={BANK_INFO.accountHolder}
                    copiedItem={copiedItem}
                    onCopy={onCopy}
                    copyText={t("common.copy", "Kopyala")}
                />
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                    <strong>{t("common.note", "Not")}:</strong> {t("checkout.payment.reference_note", BANK_INFO.referenceNote)}
                </p>
            </div>
        </m.div>
    );
}

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
    const [copiedItem, setCopiedItem] = useState<string | null>(null);
    const resolvedCardDetails = cardDetails ?? EMPTY_CARD_DETAILS;

    const copyToClipboard = async (text: string, itemId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedItem(itemId);
            toast.success(t("common.copied", "Kopyalandı!"));
            window.setTimeout(() => setCopiedItem(null), 2000);
        } catch {
            toast.error(t("common.copy_failed", "Kopyalama başarısız oldu"));
        }
    };

    const formatCardNumber = (value: string) => {
        const cleanValue = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        const matches = cleanValue.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || "";
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        return parts.length ? parts.join(" ") : value;
    };

    const formatExpiry = (value: string) => {
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

        onCardDetailsChange({ ...resolvedCardDetails, [field]: formattedValue });
    };

    const selectedInstallmentRate =
        installmentRates.find((rate) => rate.installment_number === installmentNumber)?.commission_rate ?? 0;

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t("checkout.payment_method", "Ödeme Yöntemi")}</h2>
            <p className="text-gray-500 text-sm mb-6">{t("checkout.payment_desc", "Ödeme yönteminizi seçin.")}</p>

            <div className="grid gap-4 mb-6">
                <PaymentMethodOption
                    method={CREDIT_CARD_METHOD}
                    selectedMethod={selectedMethod}
                    onSelect={onMethodChange}
                    icon={CreditCard}
                    title={t("checkout.payment.credit_card", "Kredi Kartı / Banka Kartı")}
                    description={t("checkout.payment.credit_card_desc", "3D Secure ile güvenli kart ödemesi")}
                />
                <PaymentMethodOption
                    method={BANK_TRANSFER_METHOD}
                    selectedMethod={selectedMethod}
                    onSelect={onMethodChange}
                    icon={Building2}
                    title={t("checkout.payment.bank_transfer", "Havale / EFT")}
                    description={t("checkout.payment.bank_transfer_desc", "Banka hesabına havale ile ödeme")}
                />
            </div>

            {selectedMethod === CREDIT_CARD_METHOD ? (
                <CreditCardPanel
                    cardDetails={resolvedCardDetails}
                    installmentNumber={installmentNumber}
                    installmentRates={installmentRates}
                    selectedInstallmentRate={selectedInstallmentRate}
                    onCardChange={handleCardChange}
                    onInstallmentChange={onInstallmentChange}
                />
            ) : (
                <BankTransferPanel copiedItem={copiedItem} onCopy={copyToClipboard} />
            )}
        </div>
    );
}
