import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function getErrorMessage(code: string): string {
    switch (code) {
        case "amount_mismatch":
            return "Odeme tutari dogrulama kontrolunden gecmedi. Islem manuel incelemeye alindi.";
        case "detail_query_error":
            return "Banka islem detayi alinamadi. Lutfen tekrar deneyin.";
        case "missing_finalize":
            return "Odeme tamamlandi fakat siparis olusturma adimi tamamlanamadi. Destek ekibimiz kontrol edecektir.";
        case "currency_mismatch":
            return "Para birimi dogrulamasi basarisiz oldu. Lutfen destek ile iletisime gecin.";
        case "invalid_3d_payload":
            return "3D yonlendirme verisi gecersiz. Lutfen odemeyi yeniden baslatin.";
        case "failed":
            return "3D dogrulama basarisiz veya iptal edildi.";
        default:
            return "Odeme islemi tamamlanamadi. Lutfen tekrar deneyin.";
    }
}

export default function PaymentFailed() {
    const location = useLocation();

    const { code, intent } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            code: params.get("code") || "failed",
            intent: params.get("intent") || params.get("intentId") || "",
        };
    }, [location.search]);

    useEffect(() => {
        sessionStorage.removeItem("bravita_pending_card_checkout");
        if (intent) {
            sessionStorage.removeItem(`threed:${intent}`);
        }
    }, [intent]);

    return (
        <div className="min-h-screen bg-linear-to-b from-red-50/50 to-white flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-2xl border border-red-100 bg-white p-6 shadow-lg">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="h-7 w-7" />
                </div>

                <h1 className="text-center text-2xl font-bold text-gray-900">Odeme Basarisiz</h1>
                <p className="mt-3 text-center text-sm text-gray-600">{getErrorMessage(code)}</p>

                {intent ? (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                        Islem Referansi: {intent}
                    </p>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Link to="/checkout" className="w-full">
                        <Button className="w-full bg-orange-500 text-white hover:bg-orange-600">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Tekrar Dene
                        </Button>
                    </Link>

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
