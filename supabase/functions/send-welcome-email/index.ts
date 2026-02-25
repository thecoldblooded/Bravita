// @ts-nocheck
/// <reference path="./types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchTemplateBundle, renderTemplate } from "../_shared/email-renderer.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_WEBHOOK_SECRET = Deno.env.get("APP_WEBHOOK_SECRET");

const ALLOWED_ORIGINS = [
    'https://bravita.com.tr',
    'https://bravita.vercel.app',
    'https://www.bravita.com.tr',
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

function buildWelcomePreviewLink(id: string, token: string, appBaseUrl: string): string {
    const params = new URLSearchParams({
        kind: "welcome",
        id: String(id || ""),
        token: String(token || ""),
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

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="tr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Bravita'ya Hoş Geldiniz!</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        /* Force Light Mode */
        :root {
            color-scheme: light;
        }

        body {
            background-color: #FFFBF7 !important;
            color: #1F2937 !important;
            font-family: 'Baloo 2', 'Nunito', sans-serif;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        /* Mobile */
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                border-radius: 0 !important;
            }

            .content {
                padding: 30px 20px !important;
            }

            .button {
                width: 100% !important;
                display: block !important;
                text-align: center !important;
            }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background-color: #FFFBF7;">

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0"
                    style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">

                    <tr>
                        <td height="6" style="background-color: #F97316;"></td>
                    </tr>

                    <!-- Logo Area -->
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp"
                                alt="Bravita" width="180"
                                style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>

                    <!-- Emoji Icon -->
                    <tr>
                        <td align="center" style="padding: 0 0 20px;">
                            <div style="font-size: 64px; line-height: 1;">🦙</div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td class="content" align="center" style="padding: 0 60px 40px;">
                            <h1
                                style="margin: 0 0 20px; color: #1F2937; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                                Aramıza Hoş Geldiniz!
                            </h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">
                                Bravita ailesine katıldığınız için çok mutluyuz. Artık geleceğe odaklı büyüme ve
                                sürdürülebilir başarı yolculuğumuzun bir parçasısınız.
                            </p>

                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="border-radius: 50px; background-color: #F97316;">
                                        <a href="https://www.bravita.com.tr/shop" class="button"
                                            style="display: inline-block; padding: 16px 48px; font-family: sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 50px; background-color: #F97316; border: 1px solid #F97316;">
                                            Bravita'yı Keşfet
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div
                                style="margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 30px; text-align: left;">
                                <p style="margin: 0 0 10px; color: #1F2937; font-weight: 600;">Bravita ile neler
                                    yapabilirsiniz?</p>
                                <ul
                                    style="margin: 0; padding: 0 0 0 20px; color: #4B5563; font-size: 14px; line-height: 1.8;">
                                    <li>En yeni ürünlerden ve indirimlerden ilk siz haberdar olun.</li>
                                    <li>Hesabınızı yöneterek siparişlerinizi takip edin.</li>
                                    <li>Size özel kampanyalardan faydalanmaya başlayın.</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #FFF8F0; padding: 30px;">
                            <p style="margin: 0 0 10px; color: #9CA3AF; font-size: 12px;">
                                © 2026 Bravita. Tüm hakları saklıdır.
                            </p>
                            <p style="margin: 0; font-size: 12px;">
                                <a href="{{UnsubscribeURL}}" style="color: #F97316; text-decoration: none;">Abonelikten
                                    Ayrıl</a>
                            </p>
                        </td>
                    </tr>

                </table>

                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td height="40"></td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>

</html>`;

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
 * Generates a secure signature with expiration for a given ID.
 * Format: expiration_timestamp.hmac_signature
 * Default: 5 minutes validity
 */
async function generateSignature(id: string) {
    const secret = SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!secret) {
        throw new Error("Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const expiration = Date.now() + (5 * 60 * 1000); // 5 minutes
    const data = `${id}:${expiration}`;
    const signature = await hmacSha256Hex(data, secret);

    return `${expiration}.${signature}`;
}

/**
 * Validates the secure expiring signature.
 */
async function validateSignature(id: string, token: string): Promise<SignatureValidationResult> {
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

        const expectedSignature = await hmacSha256Hex(`${id}:${expiration}`, secret);
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
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const url = new URL(req.url);
        const appBaseUrl = resolveAppBaseUrl(req);

        // --- BROWSER VIEW (GET) ---
        if (req.method === "GET") {
            const user_id = url.searchParams.get("id");
            const token = url.searchParams.get("token");

            if (!user_id || !token) {
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

            // Secure validation
            const signatureState = await validateSignature(user_id, token);
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

            const { template, variablePolicies } = await fetchTemplateBundle(supabase, "welcome_template");

            const browserLink = buildWelcomePreviewLink(user_id, token, appBaseUrl);
            const preview = renderTemplate({
                template,
                mode: "browser_preview",
                variables: {
                    NAME: "Müşterimiz",
                    BROWSER_LINK: browserLink,
                    UNSUBSCRIBE_URL: `${appBaseUrl}/unsubscribe`,
                    SITE_URL: appBaseUrl,
                },
                variablePolicies,
                fallbackValues: {
                    NAME: "Müşterimiz",
                    BROWSER_LINK: browserLink,
                    UNSUBSCRIBE_URL: `${appBaseUrl}/unsubscribe`,
                    SITE_URL: appBaseUrl,
                },
            });

            return new Response(preview.html, {
                status: 200,
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "no-store",
                    "X-Bravita-Preview-Mode": "browser_preview",
                },
            });
        }

        // --- SEND EMAIL (POST) ---
        if (!APP_WEBHOOK_SECRET) {
            return new Response(
                JSON.stringify({ error: "Server configuration error: Missing APP_WEBHOOK_SECRET" }),
                { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        const secret = req.headers.get("x-bravita-secret");
        if (secret !== APP_WEBHOOK_SECRET) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: getCorsHeaders(req) });
        }

        if (!RESEND_API_KEY) {
            throw new Error("Server configuration error: Missing RESEND_API_KEY");
        }

        // Fetch template/config/policy bundle from shared renderer module
        const { template, config, variablePolicies } = await fetchTemplateBundle(supabase, "welcome_template");

        const body = await req.json();
        const { user_id, email: directEmail } = body;

        let recipientEmail = directEmail;
        let recipientName = "Müşterimiz";

        if (user_id) {
            // Get profile for name
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", user_id)
                .single();

            if (profile) {
                recipientEmail = profile.email;
                recipientName = profile.full_name || recipientName;
            } else {
                // Fallback to auth
                const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
                if (authUser.user) recipientEmail = authUser.user.email;
            }
        }

        if (!recipientEmail) throw new Error("Recipient email is required");

        // Generate secure browser link
        const idForSignature = user_id || recipientEmail;
        const signature = await generateSignature(idForSignature);
        const browserLink = buildWelcomePreviewLink(idForSignature, signature, appBaseUrl);

        // Prepare Variables
        const variables: Record<string, string> = {
            "NAME": recipientName,
            "EMAIL": recipientEmail,
            "BROWSER_LINK": browserLink,
            "UNSUBSCRIBE_URL": `${appBaseUrl}/unsubscribe`,
            "SITE_URL": appBaseUrl,
        };

        const render = renderTemplate({
            template,
            mode: "send",
            variables,
            variablePolicies,
            fallbackValues: {
                NAME: "Müşterimiz",
                BROWSER_LINK: browserLink || "#",
                UNSUBSCRIBE_URL: `${appBaseUrl}/unsubscribe`,
                SITE_URL: appBaseUrl,
            },
        });

        if (render.blocked) {
            throw new Error(`Blocked by unresolved tokens: ${render.unresolvedTokens.join(", ")}`);
        }

        const fromName = config?.sender_name || "Bravita";
        const fromEmail = config?.sender_email || "noreply@bravita.com.tr";

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [recipientEmail],
                subject: render.subject,
                html: render.html,
                text: render.text || `Bravita'ya Hoş Geldiniz!\n\nAramıza Hoş Geldiniz, ${recipientName}.\n\nBravita'yı Keşfet: https://www.bravita.com.tr/shop`,
                ...(config?.reply_to ? { reply_to: config.reply_to } : {}),
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Resend API Error: ${JSON.stringify(data)}`);

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
        const errorMessage = error?.message || "Unknown error";

        const status = errorMessage === "Unauthorized"
            ? 401
            : (errorMessage.includes("Forbidden")
                ? 403
                : (errorMessage.includes("Server configuration error") ? 500 : 400));

        const clientError = status === 401
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
