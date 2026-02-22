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
    'https://bravita.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
];

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

function buildOrderPreviewLink(orderId: string, token: string, type: string, appBaseUrl: string): string {
    const params = new URLSearchParams({
        kind: "order",
        id: String(orderId || ""),
        token: String(token || ""),
        type: String(type || "order_confirmation"),
    });

    return `${appBaseUrl}/email-preview?${params.toString()}`;
}

const ORDER_EMAIL_TYPES = new Set([
    "order_confirmation",
    "shipped",
    "delivered",
    "cancelled",
    "processing",
    "preparing",
] as const);

type OrderEmailType =
    | "order_confirmation"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "processing"
    | "preparing";

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

function isAllowedOrderEmailType(value: string): value is OrderEmailType {
    return ORDER_EMAIL_TYPES.has(value as OrderEmailType);
}

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    // Use the origin if allowed, otherwise fallback to the first allowed origin
    // For OPTIONS requests, we can be more permissive to allow the browser to see the headers
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-custom-header",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Expose-Headers": "Content-Length, X-JSON",
        "Vary": "Origin",
    };
}

interface OrderEmailRequest {
    order_id: string;
    type?: OrderEmailType;
    tracking_number?: string;
    shipping_company?: string;
    cancellation_reason?: string;
}

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price: number;
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

serve(async (req: Request) => {
    // Handle CORS preflight requests
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
            throw new Error("Server configuration error: Missing email provider key");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const url = new URL(req.url);
        const appBaseUrl = resolveAppBaseUrl(req);

        // --- BROWSER VIEW (GET) ---
        if (req.method === "GET") {
            const order_id = url.searchParams.get("id");
            const token = url.searchParams.get("token");
            const requestedType = url.searchParams.get("type") || "order_confirmation";

            if (!order_id || !token) {
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
            if (!isAllowedOrderEmailType(requestedType)) {
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
            const type: OrderEmailType = requestedType;

            // Secure validation
            const signatureState = await validateSignature(order_id, type, token);
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

            // Fetch order data for rendering
            const { data: order, error: orderError } = await fetchOrderData(supabase, order_id);
            if (orderError || !order) {
                return new Response("Sipariş bulunamadı.", {
                    status: 404,
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-store",
                    },
                });
            }

            const { html } = await prepareEmailContent(
                supabase,
                order,
                type,
                undefined,
                undefined,
                undefined,
                buildOrderPreviewLink(order_id, token, type, appBaseUrl),
                appBaseUrl,
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
        // 1. JWT Verification & Authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const auth_token = authHeader.replace("Bearer ", "");
        const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(auth_token);

        if (authError || !requestingUser) {
            throw new Error("Unauthorized: Invalid token");
        }

        // Parse Request Body
        const {
            order_id,
            type: incomingType = "order_confirmation",
            tracking_number,
            shipping_company,
            cancellation_reason,
        }: OrderEmailRequest = await req.json();

        if (!isAllowedOrderEmailType(incomingType)) {
            throw new Error("Invalid email type");
        }
        const type: OrderEmailType = incomingType;

        if (!order_id) {
            throw new Error("Order ID is required");
        }

        // 2. Fetch Order Details & Owner Info
        const { data: order, error: orderError } = await fetchOrderData(supabase, order_id);

        if (orderError || !order) {
            throw new Error(`Order not found: ${orderError?.message}`);
        }

        // 3. SECURE AUTHORIZATION CHECK
        const { data: requesterProfile } = await supabase
            .from("profiles")
            .select("is_admin, is_superadmin")
            .eq("id", requestingUser.id)
            .maybeSingle();

        const isAdmin =
            requestingUser.app_metadata?.is_admin === true ||
            requestingUser.app_metadata?.is_superadmin === true ||
            requesterProfile?.is_admin === true ||
            requesterProfile?.is_superadmin === true;
        const isOwner = requestingUser.id === order.user_id;
        const adminOnlyEmailTypes = new Set<OrderEmailType>([
            "shipped",
            "delivered",
            "cancelled",
            "processing",
            "preparing",
        ]);

        if (adminOnlyEmailTypes.has(type) && !isAdmin) {
            throw new Error("Forbidden: Admin permission is required for this email type.");
        }

        if (type === "order_confirmation" && !isOwner && !isAdmin) {
            throw new Error("Forbidden: You do not have permission to access this order.");
        }

        // 3.5 RATE LIMIT CHECK
        const rateLimitWindowMs = type === "order_confirmation" ? 2 * 60 * 1000 : 60 * 1000;
        const rateLimitWindowStartIso = new Date(Date.now() - rateLimitWindowMs).toISOString();

        const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("sent_at")
            .eq("order_id", order_id)
            .eq("email_type", type)
            .gt("sent_at", rateLimitWindowStartIso)
            .order("sent_at", { ascending: false })
            .limit(1);

        if (recentLogs && recentLogs.length > 0) {
            return new Response(JSON.stringify({
                message: "Rate limit exceeded. Email already sent recently.",
                skipped: true
            }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                status: 429,
            });
        }

        if (type !== "order_confirmation" && order.user.order_notifications === false) {
            return new Response(JSON.stringify({ message: "User disabled notifications", skipped: true }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                status: 200,
            });
        }

        // Generate secure browser link
        const signature = await generateSignature(order_id, type);
        const browserLink = buildOrderPreviewLink(order_id, signature, type, appBaseUrl);

        const { subject, html, textContent, config, render } = await prepareEmailContent(
            supabase,
            order,
            type,
            tracking_number,
            shipping_company,
            cancellation_reason,
            browserLink,
            appBaseUrl,
        );

        if (render?.blocked) {
            throw new Error(`Blocked by unresolved tokens: ${render.unresolvedTokens.join(", ")}`);
        }

        const fromName = config?.sender_name || "Bravita";
        const fromEmail = config?.sender_email || "noreply@bravita.com.tr";

        const resendPayload: Record<string, unknown> = {
            from: `${fromName} <${fromEmail}>`,
            to: [order.user.email],
            subject,
            html,
            text: textContent,
            headers: {
                "List-Unsubscribe": "<mailto:support@bravita.com.tr>",
                "X-Entity-Ref-ID": order.id
            },
        };

        if (config?.reply_to) {
            resendPayload.reply_to = config.reply_to;
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(resendPayload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Resend API Error: ${JSON.stringify(data)}`);

        await supabase.from("email_logs").insert({
            order_id: order_id,
            email_type: type,
            recipient: order.user.email,
            sent_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({
            success: true,
            id: data.id,
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
        const errorMessage = error.message || "Unknown error";
        const status = errorMessage === "Unauthorized: Invalid token"
            ? 401
            : (errorMessage.includes("Forbidden") ? 403 : 400);
        const clientError = status === 401
            ? "Yetkisiz erişim."
            : (status === 403 ? "Bu işlem için yetkiniz yok." : "İşlem sırasında bir hata oluştu.");

        return new Response(JSON.stringify({
            error: clientError,
            message: errorMessage, // Include internal message for debugging
            status
        }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status,
        });
    }
});

/**
 * Fetches order data from Supabase.
 */
async function fetchOrderData(supabase: any, order_id: string) {
    return await supabase
        .from("orders")
        .select(`
            *,
            shipping_address:addresses(*),
            user:profiles(id, email, full_name, order_notifications, is_admin)
        `)
        .eq("id", order_id)
        .single();
}

/**
 * Prepares email subject, html, and text content using database templates.
 */
async function prepareEmailContent(
    supabase: any,
    order: any,
    type: string,
    tracking_number?: string,
    shipping_company?: string,
    cancellation_reason?: string,
    browserLink?: string,
    appBaseUrl: string = BRAVITA_SITE_URL,
    mode: "send" | "browser_preview" = "send",
) {
    // Map internal types to DB slugs
    const slugMap: Record<string, string> = {
        "order_confirmation": "order_confirmation",
        "shipped": "order_shipped",
        "delivered": "order_delivered",
        "cancelled": "order_cancelled",
        "processing": "order_processing",
        "preparing": "order_preparing"
    };

    let slug = slugMap[type] || "order_confirmation";

    // Handle special case for awaiting payment
    if (type === "order_confirmation" && order.payment_method === "bank_transfer" && order.payment_status === "pending") {
        slug = "order_awaiting_payment";
    }

    // 1. Fetch template/config/policy bundle via shared renderer
    const { template, config, variablePolicies } = await fetchTemplateBundle(supabase, slug);

    // 3. Prepare Logic Data (from original code)
    const orderDate = new Date(order.created_at).toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Istanbul"
    });

    const items: OrderItem[] = order.order_details.items;
    const totals = {
        subtotal: order.order_details.subtotal,
        discount: order.order_details.discount || 0,
        vat: order.order_details.vat_amount,
        total: order.order_details.total,
    };

    const address = order.shipping_address;
    const addressString = address
        ? `${address.street}, ${address.district || ""}, ${address.city} ${address.postal_code || ""}`
        : "Adres bilgisi bulunamadı";

    const paymentMethod = order.payment_method === "credit_card" ? "Kredi Kartı" : "Havale / EFT";

    if (!browserLink) {
        const signature = await generateSignature(order.id, type);
        browserLink = buildOrderPreviewLink(order.id, signature, type, appBaseUrl);
    }

    const sanitize = (str: string) => str ? String(str).replace(/[&<>"']/g, (m) => {
        const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[m] || m;
    }) : "";

    let itemsHtml = "";
    if (items && Array.isArray(items)) {
        for (const item of items) {
            const imgUrl = "https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-bottle.webp";
            itemsHtml += `
            <tr class="item-row">
                <td width="80" style="padding: 16px 0; border-bottom: 1px solid #F3F4F6;">
                    <div style="width: 60px; height: 60px; background-color: #F3F4F6; border-radius: 8px; overflow: hidden;">
                        <img src="${imgUrl}" alt="${sanitize(item.product_name)}" style="width: 100%; height: 100%; object-fit: contain;" />
                    </div>
                </td>
                <td style="padding: 16px 0; border-bottom: 1px solid #F3F4F6;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${sanitize(item.product_name)}</p>
                    <p style="margin: 4px 0 0; color: #6B7280; font-size: 13px;">Adet: ${item.quantity}</p>
                </td>
                <td align="right" style="padding: 16px 0; border-bottom: 1px solid #F3F4F6;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">₺${(item.unit_price * item.quantity).toFixed(2)}</p>
                </td>
            </tr>`;
        }
    }

    let bankDetailsHtml = "";
    if (order.payment_method === "bank_transfer") {
        const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
        if (settings) {
            bankDetailsHtml = `
            <div style="margin-top: 20px; padding: 20px; background-color: #F0F9FF; border-radius: 12px; border: 1px solid #BAE6FD;">
                <h3 style="margin: 0 0 10px; color: #0369A1; font-size: 14px; font-weight: 700;">Havale/EFT Bilgileri</h3>
                <p style="margin: 0; color: #0C4A6E; font-size: 14px;"><strong>Banka:</strong> ${sanitize(settings.bank_name)}</p>
                <p style="margin: 5px 0 0; color: #0C4A6E; font-size: 14px;"><strong>IBAN:</strong> ${sanitize(settings.bank_iban)}</p>
                <p style="margin: 5px 0 0; color: #0C4A6E; font-size: 14px;"><strong>Hesap Sahibi:</strong> ${sanitize(settings.bank_account_holder)}</p>
                <p style="margin: 10px 0 0; color: #0369A1; font-size: 12px; font-style: italic;">* Açıklama: #${order.id.substring(0, 8).toUpperCase()}</p>
            </div>`;
        }
    }

    // 4. Ingest variables
    const variables: Record<string, string> = {
        "ORDER_ID": order.id.substring(0, 8).toUpperCase(),
        "ORDER_DATE": orderDate,
        "NAME": order.user.full_name || "Müşterimiz",
        "ITEMS_LIST": itemsHtml,
        "SUBTOTAL": totals.subtotal.toFixed(2),
        "DISCOUNT": totals.discount.toFixed(2),
        "TAX": totals.vat.toFixed(2),
        "TOTAL": totals.total.toFixed(2),
        "SHIPPING_ADDRESS": addressString,
        "PAYMENT_METHOD": paymentMethod,
        "BANK_DETAILS": bankDetailsHtml,
        "SHIPPING_COMPANY": shipping_company || order.shipping_company || "Kargo Firması",
        "TRACKING_NUMBER": tracking_number || order.tracking_number || "Takip numarası girilmedi",
        "CANCELLATION_REASON": cancellation_reason || order.cancellation_reason || "Belirtilmedi",
        "BROWSER_LINK": browserLink,
        "ACTION_URL": `${appBaseUrl}/profile?tab=orders`,
        "SITE_URL": appBaseUrl
    };

    const render = renderTemplate({
        template,
        mode,
        variables,
        variablePolicies,
        fallbackValues: {
            NAME: "Müşterimiz",
            SITE_URL: appBaseUrl,
            BROWSER_LINK: browserLink || "#",
        },
    });

    const textContent = render.text || `Bravita Sipariş: ${render.subject}\nSipariş No: #${variables.ORDER_ID}`;

    return {
        subject: render.subject,
        html: render.html,
        textContent,
        config,
        render,
    };
}
