import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type FailureMessage = {
    primary: string;
    guidance?: string;
};

const MOKA_BANK_CODE_MESSAGES: Record<string, FailureMessage> = {
    "000": { primary: "Genel Hata" },
    "001": { primary: "Kart Sahibi Onayı Alınamadı" },
    "002": { primary: "Limit Yetersiz" },
    "003": { primary: "Kredi Kartı Numarası Geçerli Formatta Değil" },
    "004": { primary: "Genel Red" },
    "005": { primary: "Kart Sahibine Açık Olmayan İşlem" },
    "006": { primary: "Kartın Son Kullanma Tarihi Hatali" },
    "007": { primary: "Geçersiz İşlem" },
    "008": { primary: "Bankaya Bağlanılamadı" },
    "009": { primary: "Tanımsız Hata Kodu" },
    "010": { primary: "Banka SSL Hatası" },
    "011": { primary: "Manual Onay İçin Bankayı Arayınız" },
    "012": { primary: "Kart Bilgileri Hatalı - Kart No veya CVV2" },
    "013": { primary: "Visa MC Dışındaki Kartlar 3D Secure Desteklemiyor" },
    "014": { primary: "Geçersiz Hesap Numarası" },
    "015": { primary: "Geçersiz CVV" },
    "016": { primary: "Onay Mekanizması Mevcut Değil" },
    "017": { primary: "Sistem Hatası" },
    "018": { primary: "Çalıntı Kart" },
    "019": { primary: "Kayıp Kart" },
    "020": { primary: "Kısıtlı Kart" },
    "021": { primary: "Zaman Aşımı" },
    "022": { primary: "Geçersiz İşyeri" },
    "023": { primary: "Sahte Onay" },
    "024": { primary: "3D Onayı Alındı Ancak Para Karttan Çekilemedi" },
    "025": { primary: "3D Onay Alma Hatası" },
    "026": { primary: "Kart Sahibi Banka veya Kart 3D-Secure Üyesi Değil" },
    "027": { primary: "Kullanıcı Bu İşlemi Yapmaya Yetkili Değil" },
    "028": { primary: "Fraud Olasılığı" },
    "029": { primary: "Kartınız e-ticaret İşlemlerine Kapalıdır" },
};

function normalizeBankCode(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // Turn "03" -> "003", but leave "3d_auth_failed" as is
    if (/^\d+$/.test(trimmed)) {
        return trimmed.length <= 3 ? trimmed.padStart(3, "0") : trimmed;
    }

    return trimmed;
}

const CODE_FIRST_MESSAGE_KEYS = new Set([
    "3d_auth_failed",
    "installment_auth_declined",
    "failed",
    "fail",
    "callback_declined",
    "invalid_3d_payload",
]);

function getFallbackMessage(code: string): FailureMessage {
    switch (code) {
        case "amount_mismatch":
            return {
                primary: "Ödeme tutarı doğrulama kontrolünden geçmedi.",
                guidance: "İşlem güvenlik nedeniyle incelemeye alınmış olabilir. Lütfen tekrar deneyin.",
            };
        case "detail_query_error":
            return {
                primary: "Banka işlem detayı alınamadı.",
                guidance: "Geçici bir sorun olabilir. Kısa süre sonra tekrar deneyin.",
            };
        case "missing_finalize":
            return {
                primary: "Ödeme tamamlandı fakat sipariş oluşturma adımı tamamlanamadı.",
                guidance: "Destek ekibimiz işlemi kontrol edecektir.",
            };
        case "currency_mismatch":
            return {
                primary: "Para birimi doğrulaması başarısız oldu.",
                guidance: "Lütfen destek ekibiyle iletişime geçin.",
            };
        case "invalid_3d_payload":
            return {
                primary: "3D yönlendirme verisi geçersiz.",
                guidance: "Ödemeyi yeniden başlatıp tekrar deneyin.",
            };
        case "installment_auth_declined":
            return {
                primary: "Taksitli ödeme bankanız tarafından onaylanmadı.",
                guidance: "Tek çekim ile tekrar deneyin veya bankanızla görüşün.",
            };
        case "callback_declined":
        case "3d_auth_failed":
        case "failed":
        case "fail":
            return {
                primary: "3D doğrulama başarısız veya iptal edildi.",
                guidance: "Bankadan gelen doğrulama adımını tamamlayıp yeniden deneyin.",
            };
        default:
            return {
                primary: "Ödeme işlemi tamamlanamadı.",
                guidance: "Kart bilgilerinizi kontrol ederek tekrar deneyin.",
            };
    }
}

export default function PaymentFailed() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasValidPhone = !!user?.phone && isValidPhoneNumber(user.phone);
    const isPurchaseBlocked = !!user && (!user.profile_complete || !hasValidPhone);

    const { code, intent, bankCode, trxStatus } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const codeParam = (params.get("code") || "failed").trim().toLowerCase();
        const rawBankCode = (params.get("bankCode") || "").trim();

        return {
            code: codeParam,
            intent: (params.get("intent") || params.get("intentId") || "").trim(),
            bankCode: normalizeBankCode(rawBankCode),
            trxStatus: (params.get("trxStatus") || "").trim(),
        };
    }, [location.search]);

    const failureMessage = useMemo(() => {
        if (CODE_FIRST_MESSAGE_KEYS.has(code)) {
            return getFallbackMessage(code);
        }

        const directBankMessage = bankCode ? MOKA_BANK_CODE_MESSAGES[bankCode] : undefined;

        if (directBankMessage) {
            return directBankMessage;
        }

        const codeAsBankCode = normalizeBankCode(code);
        if (codeAsBankCode && MOKA_BANK_CODE_MESSAGES[codeAsBankCode]) {
            return MOKA_BANK_CODE_MESSAGES[codeAsBankCode];
        }

        return getFallbackMessage(code);
    }, [bankCode, code]);

    const handleRetry = () => {
        if (isPurchaseBlocked) {
            toast.error(
                !user?.profile_complete
                    ? "Lütfen önce profilinizi tamamlayın"
                    : "Lütfen geçerli bir telefon numarası girin",
            );
            navigate("/complete-profile");
            return;
        }

        navigate("/checkout");
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-red-50/50 to-white flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-2xl border border-red-100 bg-white p-6 shadow-lg">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="h-7 w-7" />
                </div>

                <h1 className="text-center text-2xl font-bold text-gray-900">Ödeme Başarısız</h1>

                <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 px-4 py-3 text-left">
                    <p className="text-sm font-medium text-red-700">{failureMessage.primary}</p>
                    {failureMessage.guidance ? (
                        <p className="mt-1 text-xs text-red-700/90">{failureMessage.guidance}</p>
                    ) : null}
                </div>

                {bankCode || trxStatus ? (
                    <div className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        {bankCode ? <p><span className="font-medium text-gray-700">Banka Hata Kodu:</span> {bankCode}</p> : null}
                        {trxStatus ? <p><span className="font-medium text-gray-700">İşlem Durumu:</span> {trxStatus}</p> : null}
                    </div>
                ) : null}

                {intent ? (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                        İşlem Referansı: {intent}
                    </p>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button className="w-full bg-orange-500 text-white hover:bg-orange-600" onClick={handleRetry}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tekrar Dene
                    </Button>

                    <Link to="/" className="w-full">
                        <Button variant="outline" className="w-full border-gray-200">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Ana Sayfa
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
