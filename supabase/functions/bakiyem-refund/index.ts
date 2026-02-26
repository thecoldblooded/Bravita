// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.refmokaunited.com";
const BAKIYEM_DEALER_CODE = Deno.env.get("BAKIYEM_DEALER_CODE") ?? "";
const BAKIYEM_API_USERNAME = Deno.env.get("BAKIYEM_API_USERNAME") ?? "";
const BAKIYEM_API_PASSWORD = Deno.env.get("BAKIYEM_API_PASSWORD") ?? "";

const DEFAULT_ALLOWED_ORIGINS = [
    "https://bravita.com.tr",
    "https://bravita.vercel.app",
    "https://www.bravita.com.tr",
    "http://localhost:8080",
];

const ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const ACTIVE_ALLOWED_ORIGINS = Array.from(new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...ALLOWED_ORIGINS,
]));

function isAllowedOrigin(origin: string): boolean {
    if (!origin) return false;
    if (ACTIVE_ALLOWED_ORIGINS.includes(origin)) return true;

    try {
        const parsed = new URL(origin);
        return (
            (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
            (parsed.protocol === "http:" || parsed.protocol === "https:")
        );
    } catch {
        return false;
    }
}

function corsHeaders(req: Request): HeadersInit {
    const origin = req.headers.get("Origin") ?? "";
    const allowed = isAllowedOrigin(origin) ? origin : ACTIVE_ALLOWED_ORIGINS[0] ?? "*";
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
    };
}

function response(req: Request, status: number, payload: JsonRecord): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: corsHeaders(req),
    });
}

async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function asText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function extractThreeDTrxCode(data: unknown): string {
    if (data && typeof data === "object") {
        const objectRecord = data as Record<string, unknown>;
        const direct = asText(objectRecord.threeDTrxCode ?? objectRecord.ThreeDTrxCode ?? objectRecord.TrxCode ?? objectRecord.trxCode);
        if (direct) return direct;

        const objectUrl = asText(objectRecord.Url ?? objectRecord.url ?? objectRecord.RedirectUrl ?? objectRecord.redirectUrl);
        if (objectUrl) {
            const objectUrlMatch = objectUrl.match(/[?&]threeDTrxCode=([^&]+)/i);
            if (objectUrlMatch?.[1]) {
                try {
                    return asText(decodeURIComponent(objectUrlMatch[1]));
                } catch {
                    return asText(objectUrlMatch[1]);
                }
            }
        }
    }

    if (typeof data === "string") {
        const directMatch = data.match(/[?&]threeDTrxCode=([^&]+)/i);
        if (directMatch?.[1]) {
            try {
                return asText(decodeURIComponent(directMatch[1]));
            } catch {
                return asText(directMatch[1]);
            }
        }
    }

    return "";
}

function hasOuterWhitespace(value: string): boolean {
    return value.trim() !== value;
}

function resolveHost(value: string): string {
    try {
        return new URL(value).host;
    } catch {
        return "";
    }
}

function extractUserJwt(req: Request): string | null {
    const xUserJwt = req.headers.get("x-user-jwt");
    if (xUserJwt && xUserJwt.trim().length > 0) {
        return xUserJwt.replace(/^Bearer\s+/i, "").trim();
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length).trim();
    }

    return null;
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return response(req, 405, { success: false, pending: false, message: "Method not allowed" });
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return response(req, 500, { success: false, pending: false, message: "Server config missing" });
    }

    try {
        const token = extractUserJwt(req);
        if (!token) return response(req, 401, { success: false, pending: false, message: "Unauthorized" });

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) return response(req, 401, { success: false, pending: false, message: "Unauthorized" });

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin, is_superadmin")
            .eq("id", authData.user.id)
            .single();

        if (!profile?.is_admin && !profile?.is_superadmin) {
            return response(req, 403, { success: false, pending: false, message: "Admin yetkisi gerekli" });
        }

        const body = (await req.json()) as { orderId?: string; amountCents?: number; reason?: string };
        if (!body.orderId) return response(req, 400, { success: false, pending: false, message: "orderId zorunlu" });

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, payment_intent_id, payment_status")
            .eq("id", body.orderId)
            .single();

        if (orderError || !order?.payment_intent_id) {
            return response(req, 404, { success: false, pending: false, message: "Order veya payment intent bulunamadi" });
        }

        const { data: intent, error: intentError } = await supabase
            .from("payment_intents")
            .select("id, gateway_trx_code, paid_total_cents, status")
            .eq("id", order.payment_intent_id)
            .single();

        if (intentError || !intent) {
            return response(req, 404, { success: false, pending: false, message: "Payment intent bulunamadi" });
        }

        let gatewayTrxCode = asText(intent.gateway_trx_code);

        if (!gatewayTrxCode) {
            const { data: recoveryCandidates } = await supabase
                .from("payment_transactions")
                .select("operation, response_payload, request_payload, created_at")
                .eq("intent_id", intent.id)
                .in("operation", ["init_3d", "diag_trx_code_extraction"])
                .order("created_at", { ascending: false })
                .limit(10);

            for (const tx of recoveryCandidates ?? []) {
                const responsePayload = (tx?.response_payload ?? {}) as Record<string, unknown>;
                const requestPayload = (tx?.request_payload ?? {}) as Record<string, unknown>;

                const recovered =
                    extractThreeDTrxCode((responsePayload as Record<string, unknown>)?.Data) ||
                    asText((responsePayload as Record<string, unknown>)?.extractedGatewayTrxCodeDiagnostic) ||
                    asText((responsePayload as Record<string, unknown>)?.extractedGatewayTrxCodeCurrentPath) ||
                    extractThreeDTrxCode((requestPayload as Record<string, unknown>)?.data_sample) ||
                    extractThreeDTrxCode(responsePayload);

                if (recovered) {
                    gatewayTrxCode = recovered;
                    break;
                }
            }

            if (gatewayTrxCode) {
                const persistResult = await supabase
                    .from("payment_intents")
                    .update({ gateway_trx_code: gatewayTrxCode })
                    .eq("id", intent.id);

                await supabase.from("payment_transactions").insert({
                    intent_id: intent.id,
                    order_id: order.id,
                    operation: "recover_gateway_trx_code",
                    request_payload: {
                        source: "bakiyem-refund",
                        reason: "missing_gateway_trx_code",
                    },
                    response_payload: {
                        recoveredGatewayTrxCode: gatewayTrxCode,
                        persistedToIntent: !persistResult.error,
                        persistError: persistResult.error?.message ?? null,
                    },
                    success: !persistResult.error,
                    error_code: persistResult.error ? "RECOVERY_PERSIST_FAILED" : null,
                    error_message: persistResult.error?.message ?? null,
                });
            }
        }

        if (!gatewayTrxCode) {
            return response(req, 400, { success: false, pending: false, message: "Gateway trx code bulunamadi" });
        }

        const requestedAmountCents = Number(body.amountCents);
        const hasCustomAmount = Number.isFinite(requestedAmountCents) && requestedAmountCents > 0;
        const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

        const paymentDealerRequest: JsonRecord = {
            VirtualPosOrderId: gatewayTrxCode,
            ClientIP: clientIp,
        };

        if (hasCustomAmount) {
            paymentDealerRequest.Amount = (requestedAmountCents / 100).toFixed(2);
        }

        const { data: latestInitTx, error: latestInitTxError } = await supabase
            .from("payment_transactions")
            .select("created_at, request_payload")
            .eq("intent_id", intent.id)
            .eq("operation", "init_3d")
            .order("created_at", { ascending: false })
            .limit(1);

        const latestInitRequestPayload = (latestInitTx?.[0]?.request_payload ?? {}) as Record<string, unknown>;
        const latestInitDiagRaw = latestInitRequestPayload._diag;
        const latestInitDiag = latestInitDiagRaw && typeof latestInitDiagRaw === "object"
            ? latestInitDiagRaw as Record<string, unknown>
            : null;

        const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
        const authFingerprint16 = (await sha256Hex(`${BAKIYEM_BASE_URL}|${BAKIYEM_DEALER_CODE}|${BAKIYEM_API_USERNAME}|${BAKIYEM_API_PASSWORD}`)).substring(0, 16);
        const refundAuthDiagnostics = {
            gatewayBaseUrl: BAKIYEM_BASE_URL,
            gatewayHost: resolveHost(BAKIYEM_BASE_URL),
            authFingerprint16,
            credentialShape: {
                dealerCodeLength: BAKIYEM_DEALER_CODE.length,
                usernameLength: BAKIYEM_API_USERNAME.length,
                passwordLength: BAKIYEM_API_PASSWORD.length,
                dealerCodeHasOuterWhitespace: hasOuterWhitespace(BAKIYEM_DEALER_CODE),
                usernameHasOuterWhitespace: hasOuterWhitespace(BAKIYEM_API_USERNAME),
                passwordHasOuterWhitespace: hasOuterWhitespace(BAKIYEM_API_PASSWORD),
            },
            requestShape: {
                hasCustomAmount,
                requestedAmountCents: hasCustomAmount ? requestedAmountCents : null,
                clientIpPresent: clientIp.length > 0,
                virtualPosOrderIdLength: gatewayTrxCode.length,
            },
            init3dReference: {
                queryError: latestInitTxError?.message ?? null,
                hasInit3dTransaction: (latestInitTx?.length ?? 0) > 0,
                init3dCreatedAt: latestInitTx?.[0]?.created_at ?? null,
                init3dGatewayBaseUrl: asText(latestInitDiag?.gatewayBaseUrl),
                init3dAuthFingerprint16: asText(latestInitDiag?.authFingerprint16),
            },
        };

        console.log("[bakiyem-refund] auth_diagnostics", refundAuthDiagnostics);

        const refundRequest = {
            PaymentDealerAuthentication: {
                DealerCode: BAKIYEM_DEALER_CODE,
                Username: BAKIYEM_API_USERNAME,
                Password: BAKIYEM_API_PASSWORD,
                CheckKey: checkKey,
            },
            PaymentDealerRequest: paymentDealerRequest,
        };

        const refundRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoCreateRefundRequest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(refundRequest),
        });
        const refundJson = await refundRaw.json().catch(() => ({}));
        const refundResultDiagnostics = {
            gatewayHttpStatus: refundRaw.status,
            gatewayResultCode: asText(refundJson?.ResultCode),
            gatewayResultMessage: asText(refundJson?.ResultMessage).substring(0, 180),
            gatewayBaseUrl: BAKIYEM_BASE_URL,
            gatewayHost: resolveHost(BAKIYEM_BASE_URL),
            authFingerprint16,
        };

        console.log("[bakiyem-refund] refund_result_diagnostics", refundResultDiagnostics);

        const loggedRefundResponsePayload = refundJson && typeof refundJson === "object"
            ? { ...(refundJson as Record<string, unknown>), _diag: refundResultDiagnostics }
            : { raw: refundJson, _diag: refundResultDiagnostics };

        const isSuccess = refundRaw.ok &&
            (refundJson?.ResultCode === "Success") &&
            ((refundJson?.Data?.IsSuccessful === true) || (refundJson?.Data?.ResultCode === "00"));

        await supabase.from("payment_transactions").insert({
            intent_id: intent.id,
            order_id: order.id,
            operation: "refund",
            request_payload: {
                PaymentDealerAuthentication: { DealerCode: "masked", Username: "masked", Password: "masked", CheckKey: "masked" },
                PaymentDealerRequest: paymentDealerRequest,
                _diag: refundAuthDiagnostics,
            },
            response_payload: loggedRefundResponsePayload,
            success: isSuccess,
            error_code: refundJson?.ResultCode ?? null,
            error_message: refundJson?.ResultMessage ?? null,
        });

        if (isSuccess) {
            await supabase
                .from("payment_intents")
                .update({ status: "refunded", gateway_status: "refunded" })
                .eq("id", intent.id);

            await supabase
                .from("orders")
                .update({ payment_status: "refunded" })
                .eq("id", order.id);

            return response(req, 200, { success: true, pending: false, message: "Refund basarili" });
        }

        await supabase
            .from("payment_intents")
            .update({ status: "refund_pending", gateway_status: "refund_pending" })
            .eq("id", intent.id);

        await supabase
            .from("payment_manual_review_queue")
            .upsert(
                {
                    intent_id: intent.id,
                    order_id: order.id,
                    reason: "stuck_refund_pending",
                    details: {
                        request: paymentDealerRequest,
                        response: loggedRefundResponsePayload,
                        provided_reason: body.reason ?? null,
                        auth_diagnostics: refundAuthDiagnostics,
                        result_diagnostics: refundResultDiagnostics,
                    },
                    dedupe_key: `refund_pending:${intent.id}`,
                },
                {
                    onConflict: "dedupe_key",
                    ignoreDuplicates: true,
                },
            );

        return response(req, 202, { success: false, pending: true, message: "Refund pending, manuel inceleme kuyruğuna alindi" });
    } catch (error) {
        console.error("bakiyem-refund failed", error);
        return response(req, 500, { success: false, pending: false, message: "Refund istegi islenemedi" });
    }
});
