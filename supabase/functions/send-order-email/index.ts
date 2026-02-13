/// <reference path="./types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ORDER_CONFIRMATION_HTML, SHIPPED_HTML, DELIVERED_HTML, CANCELLED_HTML, PROCESSING_HTML, PREPARING_HTML, AWAITING_PAYMENT_HTML } from "./template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = [
    'https://bravita.com.tr',
    'https://www.bravita.com.tr',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
];

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
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

/**
 * Generates a secure signature with expiration for a given ID.
 * Format: expiration_timestamp.hmac_signature
 * Default: 7 days validity
 */
async function generateSignature(id: string) {
    const secret = SUPABASE_SERVICE_ROLE_KEY;
    const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    const data = `${id}:${expiration}`; // data to sign

    const msgUint8 = new TextEncoder().encode(data + secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return `${expiration}.${signature}`;
}

/**
 * Validates the secure expiring signature.
 */
async function validateSignature(id: string, token: string) {
    try {
        const [expirationStr, signature] = token.split(".");
        if (!expirationStr || !signature) return false;

        const expiration = parseInt(expirationStr, 10);
        if (isNaN(expiration)) return false;

        // Check Expiration
        if (Date.now() > expiration) return false;

        // Re-compute Signature
        const secret = SUPABASE_SERVICE_ROLE_KEY;
        const data = `${id}:${expiration}`;

        const msgUint8 = new TextEncoder().encode(data + secret);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        return signature === expectedSignature;
    } catch {
        return false;
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
            console.error("RESEND_API_KEY is missing");
            throw new Error("Server configuration error: Missing email provider key");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const url = new URL(req.url);

        // --- BROWSER VIEW (GET) ---
        if (req.method === "GET") {
            const order_id = url.searchParams.get("id");
            const token = url.searchParams.get("token");
            const requestedType = url.searchParams.get("type") || "order_confirmation";

            if (!order_id || !token) {
                return new Response("Geçersiz istek.", { status: 400 });
            }
            if (!isAllowedOrderEmailType(requestedType)) {
                return new Response("Geçersiz istek.", { status: 400 });
            }
            const type: OrderEmailType = requestedType;

            // Secure validation
            const isValid = await validateSignature(order_id, token);
            if (!isValid) {
                return new Response("Yetkisiz erişim.", { status: 403 });
            }

            // Fetch order data for rendering
            const { data: order, error: orderError } = await fetchOrderData(supabase, order_id);
            if (orderError || !order) {
                return new Response("Sipariş bulunamadı.", { status: 404 });
            }

            const { html } = await prepareEmailContent(supabase, order, type);
            return new Response(html, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=UTF-8",
                    "X-Content-Type-Options": "nosniff"
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
            console.error("Auth error:", authError);
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
            console.error("Order fetch error:", orderError);
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
            console.error(`Access Denied: User ${requestingUser.id} tried to send admin-only email type ${type}`);
            throw new Error("Forbidden: Admin permission is required for this email type.");
        }

        if (type === "order_confirmation" && !isOwner && !isAdmin) {
            console.error(`Access Denied: User ${requestingUser.id} tried to access order ${order_id} owned by ${order.user_id}`);
            throw new Error("Forbidden: You do not have permission to access this order.");
        }

        // 3.5 RATE LIMIT CHECK
        const rateLimitWindowMs = type === "order_confirmation" ? 2 * 60 * 1000 : 60 * 1000;
        const { data: recentLogs } = await supabase
            .from("email_logs")
            .select("sent_at")
            .eq("order_id", order_id)
            .eq("email_type", type)
            .gt("sent_at", new Date(Date.now() - rateLimitWindowMs).toISOString())
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
        const signature = await generateSignature(order_id);
        const browserLink = `${url.origin}/functions/v1/send-order-email?id=${order_id}&token=${signature}&type=${type}`;

        const { subject, html, textContent } = await prepareEmailContent(supabase, order, type, tracking_number, shipping_company, cancellation_reason, browserLink);

        console.log(`Sending email to ${order.user.email} with subject: ${subject}`);

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Bravita <noreply@bravita.com.tr>",
                to: [order.user.email],
                subject: subject,
                html: html,
                text: textContent,
                headers: {
                    "List-Unsubscribe": "<mailto:support@bravita.com.tr>",
                    "X-Entity-Ref-ID": order.id
                }
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Resend API Error: ${JSON.stringify(data)}`);

        await supabase.from("email_logs").insert({
            order_id: order_id,
            email_type: type,
            recipient: order.user.email,
            sent_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, id: data.id }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        const errorMessage = error.message || "Unknown error";
        console.error(`Edge Function Error: ${errorMessage}`);
        const status = errorMessage === "Unauthorized: Invalid token"
            ? 401
            : (errorMessage.includes("Forbidden") ? 403 : 400);
        const clientError = status === 401
            ? "Yetkisiz erişim."
            : (status === 403 ? "Bu işlem için yetkiniz yok." : "İşlem sırasında bir hata oluştu.");

        return new Response(JSON.stringify({ error: clientError }), {
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
    browserLink?: string
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

    // 1. Fetch Template
    const { data: template, error: tErr } = await supabase
        .from("email_templates")
        .select("*")
        .eq("slug", slug)
        .single();

    if (tErr || !template) throw new Error(`Template not found for slug: ${slug}`);

    // 2. Fetch Config
    const { data: config } = await supabase
        .from("email_configs")
        .select("*")
        .eq("template_slug", slug)
        .limit(1)
        .maybeSingle();

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
        const signature = await generateSignature(order.id);
        browserLink = `/functions/v1/send-order-email?id=${order.id}&token=${signature}&type=${type}`;
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
        "NAME": sanitize(order.user.full_name || "Müşterimiz"),
        "ITEMS_LIST": itemsHtml,
        "SUBTOTAL": totals.subtotal.toFixed(2),
        "DISCOUNT": totals.discount.toFixed(2),
        "TAX": totals.vat.toFixed(2),
        "TOTAL": totals.total.toFixed(2),
        "SHIPPING_ADDRESS": sanitize(addressString),
        "PAYMENT_METHOD": paymentMethod,
        "BANK_DETAILS": bankDetailsHtml,
        "SHIPPING_COMPANY": sanitize(shipping_company || order.shipping_company || "Kargo Firması"),
        "TRACKING_NUMBER": sanitize(tracking_number || order.tracking_number || "Takip numarası girilmedi"),
        "CANCELLATION_REASON": sanitize(cancellation_reason || order.cancellation_reason || "Belirtilmedi"),
        "BROWSER_LINK": browserLink
    };

    let html = template.content_html;
    let subject = template.subject;

    Object.entries(variables).forEach(([key, val]) => {
        subject = subject.replaceAll(`{{${key}}}`, val);
        html = html.replaceAll(`{{${key}}}`, val);
        html = html.replaceAll(`{{ ${key} }}`, val);
    });

    const textContent = `Bravita Sipariş: ${subject}\nSipariş No: #${variables.ORDER_ID}`;

    return { subject, html, textContent };
}
