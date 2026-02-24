import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface ThreeDPayload {
    redirectUrl?: string | null;
    formAction?: string | null;
    formFields?: Record<string, unknown> | null;
    html?: string | null;
}

interface RedirectState {
    intentId?: string;
    threeD?: ThreeDPayload;
    redirectUrl?: string;
}

const MAX_HTML_PAYLOAD_LENGTH = 100_000;

function parseHtmlForm(html: string): { action: string; fields: Record<string, string> } | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const form = doc.querySelector("form");
    if (!form) return null;

    const action = form.getAttribute("action") || "";
    if (!action) return null;

    const fields: Record<string, string> = {};
    const inputs = form.querySelectorAll<HTMLInputElement>("input[name]");
    inputs.forEach((input) => {
        fields[input.name] = input.value || "";
    });

    return { action, fields };
}

function isAllowedGatewayUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== "https:") return false;

        const host = parsed.hostname.toLowerCase();
        if (
            host === "service.testmoka.com" ||
            host === "service.moka.com" ||
            host === "service.refmokaunited.com" ||
            host === "service.mokaunited.com"
        ) return true;
        if (host.endsWith(".moka.com") || host.endsWith(".mokaunited.com") || host.endsWith(".bakiyem.com")) return true;

        return false;
    } catch {
        return false;
    }
}

function submitForm(action: string, fields: Record<string, unknown>): void {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";

    Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value ?? "");
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
}

import { Helmet } from "react-helmet-async";

export default function ThreeDSRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const statePayload = useMemo(() => (location.state as RedirectState | null) ?? null, [location.state]);
    const hasValidPhone = !!user?.phone && isValidPhoneNumber(user.phone);
    const isPurchaseBlocked = !!user && (!user.profile_complete || !hasValidPhone);

    const intentId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get("intentId") || params.get("intent") || statePayload?.intentId || "";
    }, [location.search, statePayload?.intentId]);

    useEffect(() => {
        let payload: ThreeDPayload | null = null;

        if (statePayload?.threeD) {
            payload = statePayload.threeD;
        } else if (statePayload?.redirectUrl) {
            payload = { redirectUrl: statePayload.redirectUrl };
        }

        if (!payload && intentId) {
            const raw = sessionStorage.getItem(`threed:${intentId}`);
            if (raw) {
                try {
                    payload = JSON.parse(raw) as ThreeDPayload;
                } catch {
                    payload = null;
                }
            }
        }

        const getResult = (): string | null => {
            if (!payload) return "3D yönlendirme verisi bulunamadı.";

            if (payload.redirectUrl) {
                if (!isAllowedGatewayUrl(payload.redirectUrl)) {
                    return "3D yönlendirme adresi güvenlik kontrolünden geçemedi.";
                }
                if (intentId) sessionStorage.removeItem(`threed:${intentId}`);
                window.location.replace(payload.redirectUrl);
                return null;
            }

            if (payload.formAction) {
                if (!isAllowedGatewayUrl(payload.formAction)) {
                    return "3D form adresi güvenlik kontrolünden geçemedi.";
                }
                if (intentId) sessionStorage.removeItem(`threed:${intentId}`);
                submitForm(payload.formAction, payload.formFields || {});
                return null;
            }

            if (payload.html) {
                if (payload.html.length > MAX_HTML_PAYLOAD_LENGTH) {
                    return "3D içerik boyutu limiti aşıldı.";
                }
                const parsed = parseHtmlForm(payload.html);
                if (!parsed) return "3D içerik formu okunamadı.";
                if (!isAllowedGatewayUrl(parsed.action)) {
                    return "3D HTML form action güvenlik kontrolünden geçemedi.";
                }
                if (intentId) sessionStorage.removeItem(`threed:${intentId}`);
                submitForm(parsed.action, parsed.fields);
                return null;
            }

            return "3D yönlendirme verisi geçersiz.";
        };

        const error = getResult();
        if (error) {
            queueMicrotask(() => setErrorMessage(error));
        }
    }, [intentId, statePayload]);

    useEffect(() => {
        if (!errorMessage) return;

        const timeout = setTimeout(() => {
            const query = intentId ? `?intentId=${encodeURIComponent(intentId)}&code=invalid_3d_payload` : "?code=invalid_3d_payload";
            navigate(`/payment-failed${query}`, { replace: true });
        }, 1800);

        return () => clearTimeout(timeout);
    }, [errorMessage, intentId, navigate]);

    const handleReturnToCheckout = () => {
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
        <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white flex items-center justify-center px-4">
            <Helmet>
                <title>3D Secure Redirect</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-lg">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${errorMessage ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
                    {errorMessage ? <ShieldAlert className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                </div>

                <h1 className="text-lg font-bold text-gray-900">
                    {errorMessage ? "3D Yönlendirme Hatası" : "3D Güvenli Ödeme"}
                </h1>

                {errorMessage ? (
                    <>
                        <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                        <Button
                            className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600"
                            onClick={handleReturnToCheckout}
                        >
                            Checkout'a Dön
                        </Button>
                    </>
                ) : (
                    <p className="mt-2 text-sm text-gray-600">Banka doğrulama ekranına yönlendiriliyorsunuz...</p>
                )}
            </div>
        </div>
    );
}
