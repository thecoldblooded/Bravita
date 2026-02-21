// @ts-nocheck
/// <reference path="./types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchTemplateBundle, renderTemplate } from "../_shared/email-renderer.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
    'https://bravita.com.tr',
    'https://www.bravita.com.tr',
    'https://admin.bravita.com.tr',
    'https://app.bravita.com.tr',
    'https://future-focused-growth.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
];

const SUPPORT_EMAIL_TYPES = new Set([
    "ticket_created",
    "ticket_replied",
    "ticket_closed",
    "user_replied",
] as const);

type SupportEmailType = "ticket_created" | "ticket_replied" | "ticket_closed" | "user_replied";

const BRAVITA_SITE_URL = "https://www.bravita.com.tr";
const CONFIGURED_APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "").trim();

function normalizeAbsoluteBaseUrl(value: string): string | null {
    const normalized = (value || "").trim();
    if (!normalized) return null;

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.origin.replace(/\/+$/, "");
    } catch {
        return null;
    }
}

function resolveAppBaseUrl(req: Request): string {
    const origin = (req.headers.get("origin") || "").trim();
    if (origin && isAllowedOrigin(origin)) {
        const normalizedOrigin = normalizeAbsoluteBaseUrl(origin);
        if (normalizedOrigin) return normalizedOrigin;
    }

    const referer = (req.headers.get("referer") || "").trim();
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (isAllowedOrigin(refererOrigin)) {
                const normalizedRefererOrigin = normalizeAbsoluteBaseUrl(refererOrigin);
                if (normalizedRefererOrigin) return normalizedRefererOrigin;
            }
        } catch {
            // ignore invalid referer
        }
    }

    const configuredBaseUrl = normalizeAbsoluteBaseUrl(CONFIGURED_APP_BASE_URL);
    if (configuredBaseUrl) return configuredBaseUrl;

    return BRAVITA_SITE_URL;
}

function buildSupportPreviewLink(ticketId: string, token: string, type: string, appBaseUrl: string): string {
    const params = new URLSearchParams({
        kind: "support",
        id: String(ticketId || ""),
        token: String(token || ""),
        type: String(type || "ticket_created"),
    });

    return `${appBaseUrl}/email-preview?${params.toString()}`;
}

function isAllowedOrigin(origin: string): boolean {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    try {
        const parsedOrigin = new URL(origin);
        const hostname = parsedOrigin.hostname.toLowerCase();
        const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
        const isHttpProtocol = parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:";
        return isLocalHost && isHttpProtocol;
    } catch {
        return false;
    }
}

function isAllowedSupportEmailType(value: string): value is SupportEmailType {
    return SUPPORT_EMAIL_TYPES.has(value as SupportEmailType);
}

function truncateForLog(value: unknown, maxLength = 160): string {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}…`;
}

function redactEmailForLog(email: string): string {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return normalized ? "***" : "";

    const [local, domain] = normalized.split("@");
    if (!domain) return "***";

    const safeLocal = local.length <= 2
        ? `${local[0] ?? "*"}*`
        : `${local.slice(0, 2)}***`;

    return `${safeLocal}@${domain}`;
}

function isUserConversationSegment(header: string): boolean {
    const normalized = String(header || "").toLowerCase();
    if (!normalized) return false;
    if (normalized.includes("admin")) return false;

    return normalized.includes("kullanıcı")
        || normalized.includes("user")
        || normalized.includes("müşteri")
        || normalized.includes("musteri")
        || normalized.includes("yeni mesaj");
}

function extractLatestUserMessage(rawMessage: string): string {
    const normalized = String(rawMessage || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";

    const parts = normalized.split(/\n\n--- (.*?) ---\n/g);
    if (parts.length === 1) {
        return normalized;
    }

    const userMessages: string[] = [];
    const firstChunk = String(parts[0] || "").trim();
    if (firstChunk) {
        userMessages.push(firstChunk);
    }

    for (let i = 1; i < parts.length; i += 2) {
        const header = String(parts[i] || "").trim();
        const content = String(parts[i + 1] || "").trim();
        if (!content) continue;
        if (isUserConversationSegment(header)) {
            userMessages.push(content);
        }
    }

    return userMessages[userMessages.length - 1] || firstChunk || normalized;
}

function logSupportDebug(event: string, payload: Record<string, unknown> = {}) {
    console.log(`[send-support-email][${new Date().toISOString()}] ${event}`, payload);
}

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bravita-secret",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Vary": "Origin",
    };
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array | null {
    const normalized = value.trim().toLowerCase();
    if (!/^[a-f0-9]+$/.test(normalized) || normalized.length % 2 !== 0) {
        return null;
    }

    const result = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
        const parsed = Number.parseInt(normalized.slice(i, i + 2), 16);
        if (Number.isNaN(parsed)) {
            return null;
        }
        result[i / 2] = parsed;
    }

    return result;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

async function hmacSha256Hex(data: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    return bytesToHex(new Uint8Array(signature));
}

type SignatureValidationResult = "valid" | "expired" | "invalid";

/**
 * Generates a secure signature with expiration for a given ID + type.
 * Format: expiration_timestamp.hmac_signature
 * Default: 5 minutes validity
 */
async function generateSignature(id: string, type: string) {
    const secret = SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!secret) {
        throw new Error("Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const expiration = Date.now() + (5 * 60 * 1000); // 5 minutes
    const data = `${id}:${type}:${expiration}`;
    const signature = await hmacSha256Hex(data, secret);

    return `${expiration}.${signature}`;
}

/**
 * Validates the secure expiring signature.
 */
async function validateSignature(id: string, type: string, token: string): Promise<SignatureValidationResult> {
    try {
        const firstDot = token.indexOf(".");
        if (firstDot <= 0 || firstDot >= token.length - 1) return "invalid";

        const expirationStr = token.slice(0, firstDot);
        const providedSignature = token.slice(firstDot + 1).trim().toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(providedSignature)) return "invalid";

        const expiration = Number.parseInt(expirationStr, 10);
        if (!Number.isFinite(expiration)) return "invalid";

        if (Date.now() > expiration) return "expired";

        const secret = SUPABASE_SERVICE_ROLE_KEY?.trim();
        if (!secret) return "invalid";

        const expectedSignature = await hmacSha256Hex(`${id}:${type}:${expiration}`, secret);
        const providedBytes = hexToBytes(providedSignature);
        const expectedBytes = hexToBytes(expectedSignature);
        if (!providedBytes || !expectedBytes) return "invalid";

        return timingSafeEqual(providedBytes, expectedBytes) ? "valid" : "invalid";
    } catch {
        return "invalid";
    }
}

function escapeHtml(value: string): string {
    return String(value).replace(/[&<>"']/g, (char) => {
        const entityMap: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return entityMap[char] ?? char;
    });
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
    }

    if (req.method !== "GET" && req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 405,
        });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is missing");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const url = new URL(req.url);
        const appBaseUrl = resolveAppBaseUrl(req);

        // --- BROWSER VIEW (GET) ---
        if (req.method === "GET") {
            const ticket_id = url.searchParams.get("id");
            const token = url.searchParams.get("token");
            const requestedType = url.searchParams.get("type") || "ticket_created";

            if (!ticket_id || !token) {
                return new Response("Geçersiz istek.", {
                    status: 400,
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-store",
                    },
                });
            }
            if (!isAllowedSupportEmailType(requestedType)) {
                return new Response("Geçersiz istek.", {
                    status: 400,
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-store",
                    },
                });
            }
            const type: SupportEmailType = requestedType;

            // Secure validation
            const signatureState = await validateSignature(ticket_id, type, token);
            if (signatureState !== "valid") {
                const previewErrorMessage = signatureState === "expired"
                    ? "Bu önizleme bağlantısının süresi doldu. Lütfen yeni bir bağlantı isteyin."
                    : "Bu önizleme bağlantısı geçersiz.";

                return new Response(previewErrorMessage, {
                    status: 403,
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-store",
                    },
                });
            }

            // Fetch ticket data
            const { data: ticket, error: ticketError } = await supabase
                .from("support_tickets")
                .select("*")
                .eq("id", ticket_id)
                .maybeSingle();

            if (ticketError || !ticket) {
                return new Response("Destek talebi bulunamadı.", {
                    status: 404,
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-store",
                    }
                });
            }

            const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL_NOTIFY") || "support@bravita.com.tr";
            const browserLink = buildSupportPreviewLink(ticket_id, token, type, appBaseUrl);
            const { html } = await prepareSupportEmail(
                supabase,
                ticket,
                type,
                browserLink,
                SUPPORT_EMAIL,
                "browser_preview",
            );

            return new Response(html, {
                status: 200,
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "text/html; charset=UTF-8",
                    "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "no-store",
                    "X-Bravita-Preview-Mode": "browser_preview",
                },
            });
        }

        // --- SEND EMAIL (POST) ---
        const body = await req.json();
        const { ticket_id, type, captchaToken } = body;
        const requestedType = String(type || "ticket_created");

        const authHeader = req.headers.get("Authorization");

        if (!ticket_id) {
            throw new Error("Ticket ID is required");
        }

        if (!isAllowedSupportEmailType(requestedType)) {
            throw new Error("Invalid notification type");
        }
        const normalizedType: SupportEmailType = requestedType;

        logSupportDebug("request_received", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            has_auth_header: !!authHeader && authHeader !== "Bearer anon",
            has_captcha_token: typeof captchaToken === "string" && captchaToken.trim().length > 0,
        });

        // 0. Authorization Context
        let isAdmin = false;
        let requestingUserId: string | null = null;

        if (authHeader && authHeader !== "Bearer anon") {
            try {
                const authToken = authHeader.replace("Bearer ", "");
                const { data: authData, error: authError } = await supabase.auth.getUser(authToken);

                if (!authError) {
                    const requestingUser = authData?.user;
                    requestingUserId = requestingUser?.id || null;

                    if (requestingUserId) {
                        const { data: profile, error: profileError } = await supabase
                            .from("profiles")
                            .select("is_admin, is_superadmin")
                            .eq("id", requestingUserId)
                            .maybeSingle();

                        if (!profileError) {
                            isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
                        }
                    }
                }
            } catch {
                // silently continue as non-admin/anonymous context
            }
        }

        logSupportDebug("auth_context", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            requesting_user_id: requestingUserId,
            is_admin: isAdmin,
        });

        // 1. Get Ticket Data early for ownership checks
        const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .select("*")
            .eq("id", ticket_id)
            .maybeSingle();

        if (ticketError || !ticket) {
            logSupportDebug("ticket_fetch_failed", {
                ticket_id: String(ticket_id),
                type: normalizedType,
                db_error: ticketError?.message || null,
            });
            throw new Error(`Ticket not found: ${ticket_id}`);
        }

        logSupportDebug("ticket_loaded", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            ticket_status: ticket.status || null,
            has_user_id: !!ticket.user_id,
            ticket_email: redactEmailForLog(ticket.email || ""),
            message_length: String(ticket.message || "").length,
            has_conversation_history: String(ticket.message || "").includes("\n\n--- "),
            admin_reply_length: String(ticket.admin_reply || "").length,
        });

        // 2. Authorization matrix by action type
        if ((normalizedType === "ticket_replied" || normalizedType === "ticket_closed") && !isAdmin) {
            throw new Error("Forbidden: Admin access required for this action");
        }

        if (normalizedType === "user_replied") {
            if (!requestingUserId) {
                throw new Error("Unauthorized");
            }
            const isOwner = ticket.user_id && ticket.user_id === requestingUserId;
            if (!isOwner && !isAdmin) {
                throw new Error("Forbidden: Ticket ownership required");
            }
        }

        // 3. CAPTCHA validation for non-admin ticket creation flow
        if (normalizedType === "ticket_created" && !isAdmin) {
            if (!captchaToken || !String(captchaToken).trim()) {
                logSupportDebug("captcha_token_missing", {
                    ticket_id: String(ticket_id),
                    type: normalizedType,
                });
                throw new Error("Captcha token is required for guest submission");
            }

            const hCaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
            if (!hCaptchaSecret) {
                logSupportDebug("captcha_secret_missing_soft_fail", {
                    ticket_id: String(ticket_id),
                    type: normalizedType,
                });
            } else {
                try {
                    const verifyRes = await fetch("https://hcaptcha.com/siteverify", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: `response=${encodeURIComponent(String(captchaToken))}&secret=${encodeURIComponent(hCaptchaSecret)}`,
                    });

                    const verifyData = await verifyRes.json();
                    if (!verifyData.success) {
                        logSupportDebug("captcha_verify_failed", {
                            ticket_id: String(ticket_id),
                            type: normalizedType,
                            verify_errors: verifyData?.["error-codes"] || null,
                            hostname: verifyData?.hostname || null,
                        });
                        throw new Error("Invalid Captcha Token");
                    }

                    logSupportDebug("captcha_verify_passed", {
                        ticket_id: String(ticket_id),
                        type: normalizedType,
                        hostname: verifyData?.hostname || null,
                    });
                } catch (captchaError: any) {
                    const captchaMessage = String(captchaError?.message || "");
                    if (captchaMessage === "Invalid Captcha Token") {
                        throw captchaError;
                    }

                    logSupportDebug("captcha_verify_error_soft_fail", {
                        ticket_id: String(ticket_id),
                        type: normalizedType,
                        error: truncateForLog(captchaMessage, 240),
                    });
                }
            }
        }

        const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL_NOTIFY") || "support@bravita.com.tr";

        // 4. Prepare Email Content
        const signature = await generateSignature(ticket_id, normalizedType);
        const browserLink = buildSupportPreviewLink(ticket_id, signature, normalizedType, appBaseUrl);
        const { subject, html, text, to, bcc, config, render, defaultFromName, defaultFromEmail } = await prepareSupportEmail(
            supabase,
            ticket,
            normalizedType,
            browserLink,
            SUPPORT_EMAIL,
        );

        const latestUserMessage = extractLatestUserMessage(ticket.message || "");

        logSupportDebug("email_prepared", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            recipient_count: Array.isArray(to) ? to.length : 0,
            recipients: Array.isArray(to) ? to.map((email: string) => redactEmailForLog(email)) : [],
            blocked: render.blocked,
            unresolved_tokens: render.unresolvedTokens,
            warning_count: Array.isArray(render.warnings) ? render.warnings.length : 0,
            user_message_preview: truncateForLog(latestUserMessage, 120),
        });

        if (render.blocked) {
            throw new Error(`Blocked by unresolved tokens: ${render.unresolvedTokens.join(", ")}`);
        }

        const resendPayload: Record<string, unknown> = {
            from: `${config?.sender_name || defaultFromName} <${config?.sender_email || defaultFromEmail}>`,
            to,
            subject,
            html,
            text,
        };

        if (bcc) {
            resendPayload.bcc = bcc;
        }

        const replyTo = config?.reply_to || (normalizedType === "ticket_replied" ? SUPPORT_EMAIL : ticket.email);
        if (replyTo) {
            resendPayload.reply_to = replyTo;
        }

        // 5. Send via Resend
        logSupportDebug("resend_dispatch", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            to: Array.isArray(to) ? to.map((email: string) => redactEmailForLog(email)) : [],
            reply_to: redactEmailForLog(String(replyTo || "")),
            subject_preview: truncateForLog(subject, 80),
        });

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(resendPayload),
        });

        const resData = await res.json();

        if (!res.ok) {
            logSupportDebug("resend_failed", {
                ticket_id: String(ticket_id),
                type: normalizedType,
                status: res.status,
                resend_response: truncateForLog(JSON.stringify(resData), 600),
            });
            throw new Error(`Resend Error: ${JSON.stringify(resData)}`);
        }

        logSupportDebug("resend_succeeded", {
            ticket_id: String(ticket_id),
            type: normalizedType,
            resend_id: resData?.id || null,
        });

        return new Response(JSON.stringify({
            success: true,
            id: resData.id,
            render: {
                unresolved_tokens: render.unresolvedTokens,
                warnings: render.warnings,
                used_variables: render.usedVariables,
                degradation: render.degradation,
            },
        }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";

        const status =
            errorMessage === "Unauthorized"
                ? 401
                : (errorMessage.includes("Forbidden")
                    ? 403
                    : (errorMessage.includes("Server configuration error") ? 500 : 400));

        logSupportDebug("request_failed", {
            status,
            error: truncateForLog(errorMessage, 500),
        });

        const clientError =
            status === 401
                ? "Yetkisiz erişim."
                : (status === 403
                    ? "Bu işlem için yetkiniz yok."
                    : (status === 500 ? "Sunucu yapılandırma hatası." : "İstek işlenemedi."));
        return new Response(JSON.stringify({ error: clientError }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status,
        });
    }
});

/**
 * Prepares support email content using database templates.
 */
async function prepareSupportEmail(
    supabase: any,
    ticket: any,
    type: string,
    browserLink: string,
    supportEmail: string,
    mode: "send" | "browser_preview" = "send",
) {
    // Map internal types to DB slugs
    const slugMap: Record<string, string> = {
        "ticket_created": "support_ticket",
        "ticket_replied": "support_ticket_replied",
        "ticket_closed": "support_ticket_closed",
        "user_replied": "support_ticket"
    };

    const slug = slugMap[type] || "support_ticket_replied";

    // 1. Fetch template/config/policy bundle via shared renderer
    const { template, config, variablePolicies } = await fetchTemplateBundle(supabase, slug);

    const latestUserMessage = extractLatestUserMessage(ticket.message || "");

    // 2. Prepare Variables
    const CATEGORY_LABELS: Record<string, string> = {
        general: "Genel Sorular",
        order_issue: "Sipariş Sorunu",
        product_info: "Ürün Bilgisi",
        delivery: "Teslimat Hakkında",
        other: "Diğer",
    };

    const variables = {
        "NAME": ticket.name || "Müşteri",
        "EMAIL": ticket.email || "",
        "SUBJECT": ticket.subject || "Destek Talebi",
        "TICKET_ID": ticket.id.substring(0, 8).toUpperCase(),
        "CATEGORY": CATEGORY_LABELS[ticket.category] || ticket.category || "Genel Sorular",
        "USER_MESSAGE": latestUserMessage,
        "ADMIN_REPLY": ticket.admin_reply || "",
        "BROWSER_LINK": browserLink || "#",
        "SITE_URL": "https://www.bravita.com.tr",
    };

    const render = renderTemplate({
        template,
        mode,
        variables,
        variablePolicies,
        fallbackValues: {
            NAME: "Müşteri",
            BROWSER_LINK: browserLink || "#",
            SITE_URL: "https://www.bravita.com.tr",
        },
    });

    // 3. Set recipient and sender
    let to: string[];
    let bcc: string[] | undefined;

    if (type === "user_replied") {
        to = [supportEmail];
    } else if (type === "ticket_created") {
        to = [ticket.email];
        bcc = [supportEmail];
    } else {
        to = [ticket.email];
    }

    const defaultFromName = type === "ticket_created" ? "Bravita Sistem" : "Bravita Destek";
    const defaultFromEmail = type === "ticket_created" ? "noreply@bravita.com.tr" : "support@bravita.com.tr";

    const text = render.text || `Bravita Destek: ${render.subject}\n\n${variables.ADMIN_REPLY || variables.USER_MESSAGE}`;

    return {
        subject: render.subject,
        html: render.html,
        text,
        to,
        bcc,
        config,
        render,
        defaultFromName,
        defaultFromEmail,
    };
}
