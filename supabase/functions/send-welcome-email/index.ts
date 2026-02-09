/// <reference path="./types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_WEBHOOK_SECRET = Deno.env.get("APP_WEBHOOK_SECRET") || "bravita-welcome-secret-2026";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bravita-secret",
};

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="tr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Bravita'ya Hoş Geldiniz!</title>
    <style>
        /* Force Light Mode */
        :root {
            color-scheme: light;
        }

        body {
            background-color: #FFFBF7 !important;
            color: #1F2937 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
            <td align="center" style="padding: 40px 0;">

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
                            <div style="font-size: 64px; line-height: 1;">🌿</div>
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
                                            Koleksiyonu Keşfet
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

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const secret = req.headers.get("x-bravita-secret");
        if (secret !== APP_WEBHOOK_SECRET) {
            console.error("Unauthorized Secret attempt");
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        }

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is missing");
        }

        const body = await req.json();
        const { user_id, email: directEmail } = body;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let recipientEmail = directEmail;

        if (user_id) {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
            if (authError || !authUser.user) {
                console.error("Auth User fetch error:", authError);
                throw new Error("User not found");
            }
            recipientEmail = authUser.user.email;
        }

        if (!recipientEmail) {
            throw new Error("Recipient email is required");
        }

        console.log(`Sending welcome email to ${recipientEmail}`);

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Bravita <noreply@bravita.com.tr>",
                to: [recipientEmail],
                subject: "Bravita'ya Hoş Geldiniz! 🌿",
                html: WELCOME_HTML.replace("{{UnsubscribeURL}}", "https://www.bravita.com.tr/unsubscribe"),
                text: `Aramıza Hoş Geldiniz!\n\nBravita ailesine katıldığınız için çok mutluyuz.\n\nKoleksiyonu Keşfet: https://www.bravita.com.tr/shop`,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
        }

        return new Response(JSON.stringify({ success: true, id: data.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error in send-welcome-email:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
