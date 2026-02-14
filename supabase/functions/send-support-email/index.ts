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

        // --- BROWSER VIEW (GET) ---
        if (req.method === "GET") {
            const ticket_id = url.searchParams.get("id");
            const token = url.searchParams.get("token");
            const requestedType = url.searchParams.get("type") || "ticket_created";

            if (!ticket_id || !token) {
                return new Response("Geçersiz istek.", { status: 400 });
            }
            if (!isAllowedSupportEmailType(requestedType)) {
                return new Response("Geçersiz istek.", { status: 400 });
            }
            const type: SupportEmailType = requestedType;

            // Secure validation
            const isValid = await validateSignature(ticket_id, token);
            if (!isValid) {
                return new Response("Yetkisiz erişim.", { status: 403 });
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
                    headers: { ...getCorsHeaders(req), "Content-Type": "text/plain; charset=utf-8" }
                });
            }

            const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL_NOTIFY") || "support@bravita.com.tr";
            const { html } = await prepareSupportEmail(
                supabase,
                ticket,
                type,
                "#",
                SUPPORT_EMAIL,
                "browser_preview",
            );

            return new Response(html, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=UTF-8",
                    "X-Content-Type-Options": "nosniff"
                },
            });
        }

        // --- SEND EMAIL (POST) ---
        const body = await req.json();
        const { ticket_id, type, captchaToken } = body;
        const requestedType = String(type || "ticket_created");

        console.log(`[POST] Request received: type=${requestedType}, ticket_id=${ticket_id}`);
        const authHeader = req.headers.get("Authorization");

        if (!ticket_id) {
            console.error("Missing ticket_id in request body");
            throw new Error("Ticket ID is required");
        }

        if (!isAllowedSupportEmailType(requestedType)) {
            throw new Error("Invalid notification type");
        }
        const normalizedType: SupportEmailType = requestedType;

        // 0. Authorization Context
        let isAdmin = false;
        let requestingUserId: string | null = null;

        if (authHeader && authHeader !== "Bearer anon") {
            try {
                const authToken = authHeader.replace("Bearer ", "");
                const { data: authData, error: authError } = await supabase.auth.getUser(authToken);

                if (authError) {
                    console.error("Auth error verifying token:", authError.message);
                } else {
                    const requestingUser = authData?.user;
                    requestingUserId = requestingUser?.id || null;

                    if (requestingUserId) {
                        const { data: profile, error: profileError } = await supabase
                            .from("profiles")
                            .select("is_admin, is_superadmin")
                            .eq("id", requestingUserId)
                            .maybeSingle();

                        if (profileError) {
                            console.error("Error fetching profile:", profileError.message);
                        } else {
                            isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
                        }
                    }
                }
            } catch (authCatch) {
                console.error("Catch in auth logic:", authCatch);
            }
        }

        // 1. Get Ticket Data early for ownership checks
        const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .select("*")
            .eq("id", ticket_id)
            .maybeSingle();

        if (ticketError || !ticket) {
            console.error(`Ticket not found or error: ${ticket_id}`, ticketError);
            throw new Error(`Ticket not found: ${ticket_id}`);
        }

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

        // 3. CAPTCHA validation (fail-close) for non-admin ticket creation flow
        if (normalizedType === "ticket_created" && !isAdmin) {
            const hCaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
            if (!hCaptchaSecret) {
                throw new Error("Server configuration error: captcha secret missing");
            }
            if (!captchaToken) {
                throw new Error("Captcha token is required for guest submission");
            }

            const verifyRes = await fetch("https://hcaptcha.com/siteverify", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `response=${captchaToken}&secret=${hCaptchaSecret}`
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                throw new Error("Invalid Captcha Token");
            }
        }

        const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL_NOTIFY") || "support@bravita.com.tr";

        // 4. Prepare Email Content
        const signature = await generateSignature(ticket_id);
        const browserLink = `${url.origin}/functions/v1/send-support-email?id=${ticket_id}&token=${signature}&type=${normalizedType}`;
        const { subject, html, text, to, config, render, defaultFromName, defaultFromEmail } = await prepareSupportEmail(
            supabase,
            ticket,
            normalizedType,
            browserLink,
            SUPPORT_EMAIL,
        );

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

        const replyTo = config?.reply_to || (normalizedType === "ticket_replied" ? SUPPORT_EMAIL : ticket.email);
        if (replyTo) {
            resendPayload.reply_to = replyTo;
        }

        // 5. Send via Resend
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(resendPayload),
        });

        const resData = await res.json();
        console.log("Resend response:", JSON.stringify(resData));

        if (!res.ok) {
            throw new Error(`Resend Error: ${JSON.stringify(resData)}`);
        }

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
        console.error("Function error:", errorMessage);

        const status =
            errorMessage === "Unauthorized"
                ? 401
                : (errorMessage.includes("Forbidden")
                    ? 403
                    : (errorMessage.includes("Server configuration error") ? 500 : 400));

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

    // 2. Prepare Variables
    const variables: Record<string, string> = {
        "NAME": ticket.name || "Müşteri",
        "EMAIL": ticket.email || "",
        "SUBJECT": ticket.subject || "Destek Talebi",
        "TICKET_ID": ticket.id.substring(0, 8).toUpperCase(),
        "CATEGORY": ticket.category || "Genel",
        "USER_MESSAGE": ticket.message || "",
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
    const to = (type === "ticket_created" || type === "user_replied") ? [supportEmail] : [ticket.email];

    const defaultFromName = type === "ticket_created" ? "Bravita Sistem" : "Bravita Destek";
    const defaultFromEmail = type === "ticket_created" ? "noreply@bravita.com.tr" : "support@bravita.com.tr";

    const text = render.text || `Bravita Destek: ${render.subject}\n\n${variables.ADMIN_REPLY || variables.USER_MESSAGE}`;

    return {
        subject: render.subject,
        html: render.html,
        text,
        to,
        config,
        render,
        defaultFromName,
        defaultFromEmail,
    };
}
