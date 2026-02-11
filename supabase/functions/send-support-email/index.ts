/// <reference path="./types.d.ts" />
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
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bravita-secret",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    };
}

const getBaseTemplate = (title: string, content: string, emoji: string = "✉️") => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7; color: #1F2937; font-family: 'Baloo 2', 'Nunito', sans-serif; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; }
        .top-bar { height: 6px; background-color: #F97316; }
        .content { padding: 40px 60px; text-align: center; }
        .logo { width: 180px; margin-bottom: 20px; }
        .emoji { font-size: 48px; margin-bottom: 20px; }
        h1 { font-size: 24px; color: #111827; margin-bottom: 20px; }
        .message-box { background: #F9FAF7; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: left; color: #374151; line-height: 1.6; margin: 20px 0; }
        .footer { background-color: #FFF8F0; padding: 30px; text-align: center; color: #9CA3AF; font-size: 12px; line-height: 1.6; }
        .btn { display: inline-block; padding: 12px 32px; background: #F97316; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; margin-top: 20px; font-family: 'Baloo 2', 'Nunito', sans-serif; }
        .legal { margin-top: 20px; font-size: 10px; color: #D1D5DB; }
    </style>
</head>
<body>
    <div style="text-align: center; padding: 20px 0;">
        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
    </div>
    <div class="container">
        <div class="top-bar"></div>
        <div class="content">
            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" class="logo" alt="Bravita" />
            <div class="emoji">${emoji}</div>
            <h1>${title}</h1>
            ${content}
        </div>
        <div class="footer">
            <p><strong>Bravita Elektronik ve Ticaret</strong></p>
            <p>Bu e-posta, Bravita üzerinden oluşturduğunuz destek talebi hakkında bilgilendirme amacıyla gönderilmiştir. 
            Müşteri memnuniyeti bizim için her zaman önceliklidir. Sorularınız için her zaman yanınızdayız.</p>
            <p>Gelecek bildirimleri durdurmak için profil ayarlarınızdan bildirim tercihlerinizi güncelleyebilir veya bu servisten ayrılabilirsiniz.</p>
            <p>© 2026 Bravita. İstanbul, Türkiye. Tüm hakları saklıdır.</p>
            <div class="legal">
                Bu mesaj gizli bilgi içerebilir. Eğer bu mesajın alıcısı değilseniz, lütfen siliniz ve göndereni bilgilendiriniz. 
                Görüş ve önerileriniz için web sitemizi her zaman ziyaret edebilirsiniz.
            </div>
        </div>
    </div>
</body>
</html>
`;

/**
 * Generates a secure signature for a given ID to prevent unauthorized viewing.
 */
async function generateSignature(id: string) {
    const secret = SUPABASE_SERVICE_ROLE_KEY;
    const msgUint8 = new TextEncoder().encode(id + secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates the signature for a given ID and token.
 */
async function validateSignature(id: string, token: string) {
    const expected = await generateSignature(id);
    return expected === token;
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
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
            const type = (url.searchParams.get("type") || "ticket_created") as any;

            if (!ticket_id || !token) {
                return new Response("Geçersiz istek.", { status: 400 });
            }

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
            const { html } = await prepareSupportEmail(supabase, ticket, type, "", SUPPORT_EMAIL); // No link needed for view

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

        console.log(`[POST] Request received: type=${type}, ticket_id=${ticket_id}`);
        const authHeader = req.headers.get("Authorization");
        console.log(`Authorization header present: ${!!authHeader}`);

        if (!ticket_id) {
            console.error("Missing ticket_id in request body");
            throw new Error("Ticket ID is required");
        }

        // 0. Authorization Context
        let isAdmin = false;
        let requestingUserId = null;

        if (authHeader && authHeader !== "Bearer anon") {
            try {
                const authToken = authHeader.replace("Bearer ", "");
                const { data: authData, error: authError } = await supabase.auth.getUser(authToken);

                if (authError) {
                    console.error("Auth error verifying token:", authError.message);
                } else {
                    const requestingUser = authData?.user;
                    requestingUserId = requestingUser?.id || null;
                    console.log(`Requesting user ID: ${requestingUserId}`);

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
                            console.log(`Admin status for ${requestingUserId}: ${isAdmin}`);
                        }
                    }
                }
            } catch (authCatch) {
                console.error("Catch in auth logic:", authCatch);
            }
        } else {
            console.log("No valid Auth header, treating as guest");
        }

        // 1. Only allow admins to send 'replied' or 'closed' notifications
        if ((type === "ticket_replied" || type === "ticket_closed") && !isAdmin) {
            console.error(`Forbidden: isAdmin=${isAdmin}, UserId=${requestingUserId}, Type=${type}`);
            throw new Error("Forbidden: Admin access required for this action");
        }

        // 2. CAPTCHA Validation for guest ticket creation
        if (type === "ticket_created" && !isAdmin) {
            const hCaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
            if (hCaptchaSecret) {
                if (!captchaToken) throw new Error("Captcha token is required for guest submission");

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
        }

        const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL_NOTIFY") || "support@bravita.com.tr";

        // 3. Get Ticket Data
        const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .select("*")
            .eq("id", ticket_id)
            .maybeSingle();

        if (ticketError || !ticket) {
            console.error(`Ticket not found or error: ${ticket_id}`, ticketError);
            throw new Error(`Ticket not found: ${ticket_id}`);
        }

        // 4. Prepare Email Content
        const signature = await generateSignature(ticket_id);
        const browserLink = `${url.origin}/functions/v1/send-support-email?id=${ticket_id}&token=${signature}&type=${type}`;
        const { subject, html, text, to, fromEmail } = await prepareSupportEmail(supabase, ticket, type, browserLink, SUPPORT_EMAIL);

        const resendPayload = {
            from: fromEmail,
            to: to,
            reply_to: type === "ticket_replied" ? SUPPORT_EMAIL : ticket.email,
            subject: subject,
            html: html,
            text: text,
        };

        console.log("Resend Payload:", JSON.stringify(resendPayload));

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

        return new Response(JSON.stringify({ success: true, id: resData.id }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Function error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: error.message === "Unauthorized" ? 401 : (error.message.includes("Forbidden") ? 403 : 400),
        });
    }
});

/**
 * Prepares support email content using database templates.
 */
async function prepareSupportEmail(supabase: any, ticket: any, type: string, browserLink: string, supportEmail: string) {
    // Map internal types to DB slugs
    const slugMap: Record<string, string> = {
        "ticket_created": "support_ticket",
        "ticket_replied": "support_ticket_replied",
        "ticket_closed": "support_ticket_closed"
    };

    // Use type directly if not in map, or default to support_ticket_replied
    const slug = slugMap[type] || "support_ticket_replied";

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

    // 3. Prepare Variables
    const variables: Record<string, string> = {
        "NAME": ticket.name || "Müşteri",
        "EMAIL": ticket.email,
        "SUBJECT": ticket.subject || "Destek Talebi",
        "TICKET_ID": ticket.id.substring(0, 8).toUpperCase(),
        "CATEGORY": ticket.category || "Genel",
        "USER_MESSAGE": ticket.message || "",
        "ADMIN_REPLY": ticket.admin_reply || "",
        "BROWSER_LINK": browserLink || "#"
    };

    let html = template.content_html;
    let subject = template.subject;

    // Replace in subject
    Object.entries(variables).forEach(([key, val]) => {
        subject = subject.replaceAll(`{{${key}}}`, val);
    });

    // Replace in HTML
    Object.entries(variables).forEach(([key, val]) => {
        html = html.replaceAll(`{{${key}}}`, val);
        html = html.replaceAll(`{{ ${key} }}`, val); // Handles spaces
    });

    // 4. Set recipient and sender
    const to = (type === "ticket_created") ? [supportEmail] : [ticket.email];

    const fromName = config?.sender_name || (type === "ticket_created" ? "Bravita Sistem" : "Bravita Destek");
    const fromEmail = config?.sender_email || (type === "ticket_created" ? "noreply@bravita.com.tr" : "support@bravita.com.tr");

    const text = `Bravita Destek: ${subject}\n\n${variables.ADMIN_REPLY || variables.USER_MESSAGE}`;

    return {
        subject,
        html,
        text,
        to,
        fromEmail: `${fromName} <${fromEmail}>`
    };
}
