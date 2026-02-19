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

function extractUserJwt(req: Request): string | null {
    const xUserJwt = req.headers.get("x-user-jwt");
    if (xUserJwt && xUserJwt.trim().length > 0) {
        return xUserJwt.replace(/^Bearer\s+/i, "").trim();
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.replace(/^Bearer\s+/i, "").trim();
    }

    return null;
}

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Vary": "Origin",
    };
}

function toTextFromHtml(html: string): string {
    return String(html ?? "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 405,
        });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("Server configuration error: Missing RESEND_API_KEY");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Verify Superadmin
        const token = extractUserJwt(req);
        if (!token) throw new Error("Unauthorized");

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) throw new Error("Unauthorized");

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_superadmin")
            .eq("id", user.id)
            .single();

        if (!profile?.is_superadmin) {
            throw new Error("Forbidden: Superadmin only");
        }

        // 2. Parse Body
        const body = await req.json();
        const {
            template_slug,
            recipient_email,
            preview_subject,
            preview_html,
            preview_uses_sample_data,
        } = body || {};

        if (!template_slug || !recipient_email) {
            throw new Error("Missing template_slug or recipient_email");
        }

        // 3. Fetch template/config/policy bundle from shared renderer module
        const { template, config, variablePolicies } = await fetchTemplateBundle(supabase, template_slug);

        // 4. Prepare content with shared render pipeline (test mode = warn, no block)
        const dummyVars: Record<string, string> = {
            "ORDER_ID": "TEST-12345",
            "ORDER_DATE": new Date().toLocaleDateString("tr-TR"),
            "TOTAL": "99.90",
            "ITEMS_LIST": "<tr><td>Test Ürün x 1</td><td align='right'>₺99.90</td></tr>",
            "SHIPPING_ADDRESS": "Test Mahallesi, Test Sokak no:1, İstanbul",
            "BROWSER_LINK": "#",
            "ADMIN_REPLY": "Bu bir test yanıtıdır.",
            "USER_MESSAGE": "Test mesajı içeriği.",
            "CONFIRMATION_URL": "https://bravita.com.tr/test-confirm",
            "UNSUBSCRIBE_URL": "https://bravita.com.tr/unsubscribe",
            "SITE_URL": "https://bravita.com.tr",
            "NAME": "Test Kullanıcı"
        };

        const renderResult = renderTemplate({
            template,
            mode: "test",
            variables: dummyVars,
            variablePolicies,
        });

        const hasClientPreview = typeof preview_html === "string" && preview_html.trim().length > 0;
        const effectiveSubject = typeof preview_subject === "string" && preview_subject.trim().length > 0
            ? preview_subject.trim()
            : renderResult.subject;
        const effectiveHtml = hasClientPreview ? preview_html : renderResult.html;
        const effectiveText = hasClientPreview ? toTextFromHtml(effectiveHtml) : renderResult.text;

        // 5. Send via Resend
        const fromName = config?.sender_name || "Bravita Test";
        const fromEmail = config?.sender_email || "noreply@bravita.com.tr";
        const resendPayload: Record<string, unknown> = {
            from: `${fromName} <${fromEmail}>`,
            to: [recipient_email],
            subject: `[TEST] ${effectiveSubject}`,
            html: effectiveHtml,
            text: effectiveText,
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

        const resData = await res.json();
        if (!res.ok) throw new Error(`Resend Error: ${JSON.stringify(resData)}`);

        const { error: logError } = await supabase.from("email_logs").insert({
            email_type: template_slug,
            template_slug,
            recipient: recipient_email,
            recipient_email,
            subject: `[TEST] ${effectiveSubject}`,
            content_snapshot: effectiveHtml,
            sent_at: new Date().toISOString(),
            mode: "test",
            blocked: renderResult.blocked,
            error_details: renderResult.warnings?.length ? renderResult.warnings.join(" | ") : null,
            render_warnings: renderResult.warnings || [],
            unresolved_tokens: renderResult.unresolvedTokens || [],
            degradation_active: !!renderResult.degradation?.active,
            degradation_reason: renderResult.degradation?.reason || null,
            template_version: template?.version || null,
            metadata: {
                channel: "admin_test_send",
                resend_id: resData?.id || null,
                used_variables: renderResult.usedVariables || [],
                content_source: hasClientPreview ? "admin_preview" : "server_render",
                preview_uses_sample_data: !!preview_uses_sample_data,
            },
        });

        if (logError) {
            console.error("Failed to write test email log:", logError.message || logError);
        }

        return new Response(JSON.stringify({
            success: true,
            id: resData.id,
            render: {
                blocked: renderResult.blocked,
                unresolved_tokens: renderResult.unresolvedTokens,
                warnings: renderResult.warnings,
                used_variables: renderResult.usedVariables,
                degradation: renderResult.degradation,
            },
            content_source: hasClientPreview ? "admin_preview" : "server_render",
        }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        const status = errorMessage === "Unauthorized" ? 401 : (errorMessage.includes("Forbidden") ? 403 : 400);
        const clientError = status === 401
            ? "Yetkisiz erişim."
            : (status === 403 ? "Bu işlem için yetkiniz yok." : "İstek işlenemedi.");

        return new Response(JSON.stringify({ error: clientError }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status,
        });
    }
});
