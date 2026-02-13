import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        if (host === "service.testmoka.com" || host === "service.moka.com") return true;
        if (host.endsWith(".moka.com") || host.endsWith(".bakiyem.com")) return true;

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

export default function ThreeDSRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const statePayload = useMemo(() => (location.state as RedirectState | null) ?? null, [location.state]);

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

        if (!payload) {
            setErrorMessage("3D yonlendirme verisi bulunamadi.");
            return;
        }

        if (payload.redirectUrl) {
            if (!isAllowedGatewayUrl(payload.redirectUrl)) {
                setErrorMessage("3D yonlendirme adresi guvenlik kontrolunden gecemedi.");
                return;
            }

            if (intentId) {
                sessionStorage.removeItem(`threed:${intentId}`);
            }
            window.location.replace(payload.redirectUrl);
            return;
        }

        if (payload.formAction) {
            if (!isAllowedGatewayUrl(payload.formAction)) {
                setErrorMessage("3D form adresi guvenlik kontrolunden gecemedi.");
                return;
            }

            if (intentId) {
                sessionStorage.removeItem(`threed:${intentId}`);
            }
            submitForm(payload.formAction, payload.formFields || {});
            return;
        }

        if (payload.html) {
            if (payload.html.length > MAX_HTML_PAYLOAD_LENGTH) {
                setErrorMessage("3D icerik boyutu limiti asildi.");
                return;
            }

            const parsed = parseHtmlForm(payload.html);
            if (!parsed) {
                setErrorMessage("3D icerik formu okunamadi.");
                return;
            }

            if (!isAllowedGatewayUrl(parsed.action)) {
                setErrorMessage("3D HTML form action guvenlik kontrolunden gecemedi.");
                return;
            }

            if (intentId) {
                sessionStorage.removeItem(`threed:${intentId}`);
            }
            submitForm(parsed.action, parsed.fields);
            return;
        }

        setErrorMessage("3D yonlendirme verisi gecersiz.");
    }, [intentId, statePayload]);

    useEffect(() => {
        if (!errorMessage) return;

        const timeout = setTimeout(() => {
            const query = intentId ? `?intentId=${encodeURIComponent(intentId)}&code=invalid_3d_payload` : "?code=invalid_3d_payload";
            navigate(`/payment-failed${query}`, { replace: true });
        }, 1800);

        return () => clearTimeout(timeout);
    }, [errorMessage, intentId, navigate]);

    return (
        <div className="min-h-screen bg-linear-to-b from-orange-50/50 to-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-lg">
                {errorMessage ? (
                    <>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">3D Yonlendirme Hatasi</h1>
                        <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                        <Button
                            className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600"
                            onClick={() => navigate("/checkout")}
                        >
                            Checkout'a Don
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">3D Guvenli Odeme</h1>
                        <p className="mt-2 text-sm text-gray-600">Banka dogrulama ekranina yonlendiriliyorsunuz...</p>
                    </>
                )}
            </div>
        </div>
    );
}
