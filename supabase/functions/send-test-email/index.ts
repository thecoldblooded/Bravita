import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const allowedOrigin = (isLocalhost || ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    };
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
    }

    try {
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

        // 3. Fetch Template & Config
        const { data: template, error: tErr } = await supabase
            .from("email_templates")
            .select("*")
            .eq("slug", template_slug)
            .single();

        if (tErr || !template) throw new Error("Template not found");

        const { data: config } = await supabase
            .from("email_configs")
            .select("*")
            .eq("template_slug", template_slug)
            .limit(1)
            .maybeSingle();

        // 4. Prepare Content (Simple replacement for test)
        let html = template.content_html;
        const dummyVars: Record<string, string> = {
            "ORDER_ID": "TEST-12345",
            "ORDER_DATE": new Date().toLocaleDateString("tr-TR"),
            "TOTAL": "99.90",
            "ITEMS_LIST": "<tr><td>Test Ürün x 1</td><td align='right'>₺99.90</td></tr>",
            "SHIPPING_ADDRESS": "Test Mahallesi, Test Sokak no:1, İstanbul",
            "BROWSER_LINK": "#",
            "ADMIN_REPLY": "Bu bir test yanıtıdır.",
            "USER_MESSAGE": "Test mesajı içeriği.",
            "ConfirmationURL": "https://bravita.com.tr/test-confirm",
            "UnsubscribeURL": "https://bravita.com.tr/unsubscribe"
        };

        Object.entries(dummyVars).forEach(([key, val]) => {
            html = html.replaceAll(`{{${key}}}`, val);
            // Handle Handlebars style if any
            html = html.replaceAll(`{{ ${key} }}`, val);
            html = html.replaceAll(`{{.${key}}}`, val);
        });

        // 5. Send via Resend
        const fromName = config?.sender_name || "Bravita Test";
        const fromEmail = config?.sender_email || "noreply@bravita.com.tr";

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: [recipient_email],
                subject: `[TEST] ${template.subject}`,
                html: html,
            }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(`Resend Error: ${JSON.stringify(resData)}`);

        return new Response(JSON.stringify({ success: true, id: resData.id }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: error.message === "Unauthorized" ? 401 : 400,
        });
    }
});
