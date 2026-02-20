import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type PreviewKind = "order" | "support" | "welcome";

interface PreviewRequest {
    requestUrl: string;
    kind: PreviewKind;
    id: string;
    type: string | null;
}

const PREVIEW_KIND_LABELS: Record<PreviewKind, string> = {
    order: "Sipariş",
    support: "Destek",
    welcome: "Hoş geldin",
};

const PREVIEW_TYPE_LABELS: Record<string, string> = {
    order_confirmation: "Sipariş onayı",
    shipped: "Kargoya verildi",
    delivered: "Teslim edildi",
    cancelled: "İptal edildi",
    processing: "İşleniyor",
    preparing: "Hazırlanıyor",
    ticket_created: "Talep oluşturuldu",
    ticket_replied: "Destek yanıtı gönderildi",
    ticket_closed: "Talep kapatıldı",
    user_replied: "Kullanıcı yanıtı gönderdi",
};

function getPreviewKindLabel(kind: PreviewKind): string {
    return PREVIEW_KIND_LABELS[kind];
}

function getPreviewTypeLabel(type: string | null): string | null {
    if (!type) return null;
    return PREVIEW_TYPE_LABELS[type] || "Diğer bildirim";
}

function resolvePreviewRequest(search: string): { request: PreviewRequest | null; error: string | null } {
    const params = new URLSearchParams(search);

    const kindRaw = (params.get("kind") || "").trim().toLowerCase();
    const id = (params.get("id") || "").trim();
    const token = (params.get("token") || "").trim();
    const type = (params.get("type") || "").trim() || null;

    if (kindRaw !== "order" && kindRaw !== "support" && kindRaw !== "welcome") {
        return {
            request: null,
            error: "Geçersiz önizleme kategorisi. Bağlantı bozuk veya eksik olabilir.",
        };
    }

    if (!id || !token) {
        return {
            request: null,
            error: "Önizleme bağlantısı eksik veya geçersiz görünüyor.",
        };
    }

    const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
    if (!supabaseUrl) {
        return {
            request: null,
            error: "Önizleme servisi yapılandırması eksik (VITE_SUPABASE_URL).",
        };
    }

    const functionName = kindRaw === "order"
        ? "send-order-email"
        : kindRaw === "support"
            ? "send-support-email"
            : "send-welcome-email";

    const query = new URLSearchParams({ id, token });
    if (type && kindRaw !== "welcome") {
        query.set("type", type);
    }

    return {
        request: {
            requestUrl: `${supabaseUrl}/functions/v1/${functionName}?${query.toString()}`,
            kind: kindRaw,
            id,
            type,
        },
        error: null,
    };
}

function getClientErrorMessage(status: number, body: string): string {
    const normalizedBody = body.trim();
    if (normalizedBody) return normalizedBody;

    if (status === 403) return "Bu önizleme bağlantısı geçersiz veya süresi dolmuş.";
    if (status === 404) return "Önizleme içeriği bulunamadı.";
    if (status === 400) return "Önizleme bağlantısı hatalı görünüyor.";
    return `Önizleme alınamadı (HTTP ${status}).`;
}

export default function EmailPreview() {
    const location = useLocation();

    const [html, setHtml] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    const resolved = useMemo(() => resolvePreviewRequest(location.search), [location.search]);

    useEffect(() => {
        const request = resolved.request;

        if (!request) {
            setHtml("");
            setIsLoading(false);
            setError(resolved.error || "Önizleme bağlantısı doğrulanamadı.");
            return;
        }

        const controller = new AbortController();

        const loadPreview = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(request.requestUrl, {
                    method: "GET",
                    headers: {
                        Accept: "text/html, text/plain;q=0.9,*/*;q=0.8",
                    },
                    signal: controller.signal,
                });

                const body = await response.text();

                if (!response.ok) {
                    throw new Error(getClientErrorMessage(response.status, body));
                }

                const trimmed = body.trim();
                if (!trimmed) {
                    throw new Error("Önizleme yanıtı boş döndü.");
                }

                setHtml(body);
            } catch (fetchError: unknown) {
                if (fetchError instanceof Error && fetchError.name === "AbortError") {
                    return;
                }

                const message = fetchError instanceof Error
                    ? fetchError.message
                    : "Önizleme yüklenirken beklenmeyen bir hata oluştu.";

                setHtml("");
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        loadPreview();

        return () => controller.abort();
    }, [resolved.request, resolved.error, reloadTick]);

    return (
        <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white px-4 py-6">
            <Helmet>
                <title>E-posta Önizleme | Bravita</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">E-posta Önizleme</h1>
                                {resolved.request ? (
                                    <p className="text-xs text-gray-500">
                                        Kategori: <span className="font-medium">{getPreviewKindLabel(resolved.request.kind)}</span>
                                        {resolved.request.type ? ` • Bildirim: ${getPreviewTypeLabel(resolved.request.type)}` : ""}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="border-orange-200 text-orange-700 hover:bg-orange-50"
                            onClick={() => setReloadTick((prev) => prev + 1)}
                            disabled={isLoading}
                        >
                            Yenile
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex min-h-[65vh] items-center justify-center rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
                        <div className="text-center text-gray-600">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                            <p className="mt-3 text-sm">Önizleme yükleniyor...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex min-h-[45vh] items-center justify-center rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
                        <div className="max-w-xl text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-red-700">Önizleme açılamadı</p>
                            <p className="mt-2 text-sm text-gray-600">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-[78vh] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
                        <iframe
                            title="E-posta önizleme"
                            className="h-full w-full border-none"
                            srcDoc={html}
                            sandbox="allow-popups allow-popups-to-escape-sandbox"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
