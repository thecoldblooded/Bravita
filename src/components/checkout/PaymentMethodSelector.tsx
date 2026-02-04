import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Building2, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CardDetails {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
}

interface PaymentMethodSelectorProps {
    selectedMethod: "credit_card" | "bank_transfer";
    cardDetails?: CardDetails;
    onMethodChange: (method: "credit_card" | "bank_transfer") => void;
    onCardDetailsChange: (details: CardDetails) => void;
}

const BANK_INFO = {
    bankName: "Ziraat Bankası",
    iban: "TR00 0000 0000 0000 0000 0000 00",
    accountHolder: "Bravita Sağlık A.Ş.",
    referenceNote: "Sipariş numaranızı açıklama kısmına yazınız.",
};

export function PaymentMethodSelector({
    selectedMethod,
    cardDetails,
    onMethodChange,
    onCardDetailsChange,
}: PaymentMethodSelectorProps) {
    const [localCardDetails, setLocalCardDetails] = useState<CardDetails>(
        cardDetails || { number: "", expiry: "", cvv: "", name: "" }
    );

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
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        if (v.length >= 2) {
            return v.substring(0, 2) + "/" + v.substring(2, 4);
        }
        return v;
    };

    const handleCardChange = (field: keyof CardDetails, value: string) => {
        let formattedValue = value;

        if (field === "number") {
            formattedValue = formatCardNumber(value);
        } else if (field === "expiry") {
            formattedValue = formatExpiry(value.replace("/", ""));
        } else if (field === "cvv") {
            formattedValue = value.replace(/[^0-9]/g, "").substring(0, 3);
        }

        const updated = { ...localCardDetails, [field]: formattedValue };
        setLocalCardDetails(updated);
        onCardDetailsChange(updated);
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ödeme Yöntemi</h2>
            <p className="text-gray-500 text-sm mb-6">Ödeme yönteminizi seçin.</p>

            <div className="grid gap-4 mb-6">
                {/* Credit Card Option */}
                <motion.button
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
                            <h3 className="font-medium text-gray-900">Kredi Kartı / Banka Kartı</h3>
                            <p className="text-sm text-gray-500">Test ortamı - Herhangi bir kart numarası kabul edilir</p>
                        </div>
                        {selectedMethod === "credit_card" && (
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </motion.button>

                {/* Bank Transfer Option */}
                <motion.button
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
                            <h3 className="font-medium text-gray-900">Havale / EFT</h3>
                            <p className="text-sm text-gray-500">Banka hesabına havale ile ödeme</p>
                        </div>
                        {selectedMethod === "bank_transfer" && (
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </motion.button>
            </div>

            {/* Credit Card Form */}
            {selectedMethod === "credit_card" && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-linear-to-br from-gray-800 to-gray-900 p-6 rounded-2xl text-white overflow-hidden"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-400">Test Modu - Gerçek ödeme alınmaz</span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cardName" className="text-gray-300">Kart Üzerindeki İsim</Label>
                            <Input
                                id="cardName"
                                value={localCardDetails.name}
                                onChange={(e) => handleCardChange("name", e.target.value)}
                                placeholder="AD SOYAD"
                                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cardNumber" className="text-gray-300">Kart Numarası</Label>
                            <Input
                                id="cardNumber"
                                value={localCardDetails.number}
                                onChange={(e) => handleCardChange("number", e.target.value)}
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono text-lg tracking-wider"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expiry" className="text-gray-300">Son Kullanma</Label>
                                <Input
                                    id="expiry"
                                    value={localCardDetails.expiry}
                                    onChange={(e) => handleCardChange("expiry", e.target.value)}
                                    placeholder="AA/YY"
                                    maxLength={5}
                                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cvv" className="text-gray-300">CVV</Label>
                                <Input
                                    id="cvv"
                                    type="password"
                                    value={localCardDetails.cvv}
                                    onChange={(e) => handleCardChange("cvv", e.target.value)}
                                    placeholder="•••"
                                    maxLength={3}
                                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bank Transfer Info */}
            {selectedMethod === "bank_transfer" && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50 border border-blue-100 p-6 rounded-2xl overflow-hidden"
                >
                    <h3 className="font-medium text-blue-900 mb-4">Banka Hesap Bilgileri</h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Banka:</span>
                            <span className="font-medium text-gray-900">{BANK_INFO.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">IBAN:</span>
                            <span className="font-mono text-gray-900">{BANK_INFO.iban}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Hesap Sahibi:</span>
                            <span className="font-medium text-gray-900">{BANK_INFO.accountHolder}</span>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>Not:</strong> {BANK_INFO.referenceNote}
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
