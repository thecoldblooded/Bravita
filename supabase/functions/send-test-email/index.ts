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
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Vary": "Origin",
    };
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

        // 1. Verify Admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) throw new Error("Unauthorized");

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin, is_superadmin")
            .eq("id", user.id)
            .single();

        if (!profile?.is_admin && !profile?.is_superadmin) {
            throw new Error("Forbidden: Admin only");
        }

        // 2. Parse Body
        const { template_slug, recipient_email } = await req.json();
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

        // 5. Send via Resend
        const fromName = config?.sender_name || "Bravita Test";
        const fromEmail = config?.sender_email || "noreply@bravita.com.tr";
        const resendPayload: Record<string, unknown> = {
            from: `${fromName} <${fromEmail}>`,
            to: [recipient_email],
            subject: `[TEST] ${renderResult.subject}`,
            html: renderResult.html,
            text: renderResult.text,
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
