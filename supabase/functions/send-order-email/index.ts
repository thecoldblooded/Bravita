
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ORDER_CONFIRMATION_HTML, SHIPPED_HTML, DELIVERED_HTML, CANCELLED_HTML, PROCESSING_HTML, PREPARING_HTML } from "./template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
    order_id: string;
    type?: "order_confirmation" | "shipped" | "delivered" | "cancelled" | "processing" | "preparing";
    tracking_number?: string;
    shipping_company?: string;
    cancellation_reason?: string;
}

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price: number;
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY is missing");
            throw new Error("Server configuration error: Missing email provider key");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. JWT Verification & Authorization
        // We manually verify the token here since we disabled the platform-level verify_jwt
        // to avoid 401 errors during session refresh/handoffs.
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !requestingUser) {
            console.error("Auth error:", authError);
            throw new Error("Unauthorized: Invalid token");
        }

        // Parse Request Body
        const { order_id, type = "order_confirmation", tracking_number, shipping_company, cancellation_reason }: OrderEmailRequest = await req.json();

        if (!order_id) {
            throw new Error("Order ID is required");
        }

        // 2. Fetch Order Details & Owner Info
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
                *,
                shipping_address:addresses(*),
                user:profiles(id, email, full_name, order_notifications, is_admin)
            `)
            .eq("id", order_id)
            .single();

        if (orderError || !order) {
            console.error("Order fetch error:", orderError);
            throw new Error(`Order not found: ${orderError?.message}`);
        }

        // 3. SECURE AUTHORIZATION CHECK
        // Allow if user is admin OR if user owns the order
        const isAdmin = requestingUser.app_metadata?.is_admin === true || order.user.is_admin === true; // Check both metadata and profile
        const isOwner = requestingUser.id === order.user_id;

        if (!isOwner && !isAdmin) {
            console.error(`Access Denied: User ${requestingUser.id} tried to access order ${order_id} owned by ${order.user_id}`);
            throw new Error("Forbidden: You do not have permission to access this order.");
        }

        // 3.5 RATE LIMIT CHECK
        // Check if an email for this order and type was sent recently (2 minutes)
        // Only applies to order_confirmation to prevent spam, allow status updates
        if (type === "order_confirmation") {
            const { data: recentLogs } = await supabase
                .from("email_logs")
                .select("sent_at")
                .eq("order_id", order_id)
                .eq("email_type", type)
                .gt("sent_at", new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes
                .limit(1);

            if (recentLogs && recentLogs.length > 0) {
                console.log(`Rate Limit Exceeded: Email for order ${order_id} type ${type} was sent recently.`);
                return new Response(JSON.stringify({
                    message: "Rate limit exceeded. Email already sent recently.",
                    skipped: true
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 429,
                });
            }
        }

        // Check user preferences for notifications
        if (type !== "order_confirmation" && order.user.order_notifications === false) {
            console.log(`User ${order.user.email} has disabled order notifications. Skipping email for type: ${type}`);
            return new Response(JSON.stringify({ message: "User disabled notifications", skipped: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 4. Prepare Data
        const orderDate = new Date(order.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
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

        const paymentMethod =
            order.payment_method === "credit_card" ? "Kredi Kartı" : "Havale / EFT";

        // 5. HTML Escape Helper
        const sanitize = (str: string) => str ? String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m as keyof typeof map])) : "";
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

        let itemsHtml = "";
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const imgUrl = "https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-bottle.webp";
                // Only show product name and qty, simple table row
                itemsHtml += `
            <tr class="item-row">
                <td width="80" style="padding: 16px 0;">
                    <div style="width: 60px; height: 60px; background-color: #F3F4F6; border-radius: 8px; overflow: hidden;">
                        <img src="${imgUrl}" alt="${sanitize(item.product_name)}" style="width: 100%; height: 100%; object-fit: contain;" />
                    </div>
                </td>
                <td style="padding: 16px 0;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${sanitize(item.product_name)}</p>
                    <p style="margin: 4px 0 0; color: #6B7280; font-size: 13px;">Adet: ${item.quantity}</p>
                </td>
                <td align="right" style="padding: 16px 0;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">₺${(item.unit_price * item.quantity).toFixed(2)}</p>
                </td>
            </tr>`;
            }
        }

        // 6. Determine Template and Context
        let html = "";
        let subject = "";
        let textContent = "";
        let bankDetailsHtml = "";
        let bankDetailsText = "";

        // Fetch Bank Details if payment method is bank_transfer
        if (order.payment_method === "bank_transfer") {
            const { data: settings } = await supabase
                .from("site_settings")
                .select("bank_name, bank_iban, bank_account_holder")
                .eq("id", 1)
                .single();

            if (settings) {
                bankDetailsHtml = `
                <div style="margin-top: 20px; padding: 20px; background-color: #F0F9FF; border-radius: 12px; border: 1px solid #BAE6FD;">
                    <h3 style="margin: 0 0 10px; color: #0369A1; font-size: 14px; font-weight: 700; text-transform: uppercase;">Havale/EFT Bilgileri</h3>
                    <p style="margin: 0 5px 0 0; color: #0C4A6E; font-size: 14px;"><strong>Banka:</strong> ${sanitize(settings.bank_name)}</p>
                    <p style="margin: 5px 0 0; color: #0C4A6E; font-size: 14px;"><strong>IBAN:</strong> ${sanitize(settings.bank_iban)}</p>
                    <p style="margin: 5px 0 0; color: #0C4A6E; font-size: 14px;"><strong>Hesap Sahibi:</strong> ${sanitize(settings.bank_account_holder)}</p>
                    <p style="margin: 10px 0 0; color: #0369A1; font-size: 12px; font-style: italic;">* Açıklama kısmına sipariş numaranızı (<strong>#${order.id.substring(0, 8).toUpperCase()}</strong>) yazmayı unutmayınız.</p>
                </div>`;

                bankDetailsText = `\nHavale/EFT Bilgileri:\nBanka: ${settings.bank_name}\nIBAN: ${settings.bank_iban}\nHesap Sahibi: ${settings.bank_account_holder}\nLütfen açıklama kısmına sipariş numaranızı (#${order.id.substring(0, 8).toUpperCase()}) yazınız.\n`;
            }
        }

        const commonTextInfo = `
Sipariş No: #${order.id.substring(0, 8).toUpperCase()}
Tarih: ${orderDate}
Ürünler:
${items ? items.map((item: OrderItem) => `- ${item.product_name} (${item.quantity} adet)`).join('\n') : ''}
Teslimat Adresi: ${addressString}
${bankDetailsText}
        `;

        if (type === "shipped") {
            const validTrackingNumber = sanitize(tracking_number || order.tracking_number || "");
            const validShippingCompany = sanitize(shipping_company || order.shipping_company || "Kargo Firması");

            subject = `Siparişiniz Kargoya Verildi 🚚 #${order.id.substring(0, 8).toUpperCase()}`;
            html = SHIPPED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SHIPPING_ADDRESS}}", sanitize(addressString))
                .replace("{{SHIPPING_COMPANY}}", validShippingCompany)
                .replace("{{TRACKING_NUMBER}}", validTrackingNumber || "Takip numarası girilmedi");

            textContent = `Siparişiniz Kargoya Verildi!\n\nKargo Firması: ${validShippingCompany}\nTakip Numarası: ${validTrackingNumber}\n\n${commonTextInfo}`;

        } else if (type === "delivered") {
            subject = `Siparişiniz Teslim Edildi ✅ #${order.id.substring(0, 8).toUpperCase()}`;
            html = DELIVERED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SHIPPING_ADDRESS}}", sanitize(addressString));

            textContent = `Siparişiniz Teslim Edildi!\n\nBizi tercih ettiğiniz için teşekkürler.\n\n${commonTextInfo}`;

        } else if (type === "cancelled") {
            subject = `Siparişiniz İptal Edildi ❌ #${order.id.substring(0, 8).toUpperCase()}`;
            const reason = sanitize(cancellation_reason || order.cancellation_reason || "Belirtilmedi");

            html = CANCELLED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{CANCELLATION_REASON}}", reason);

            textContent = `Siparişiniz İptal Edildi!\n\nİptal Nedeni: ${reason}\n\n${commonTextInfo}`;

        } else if (type === "processing") {
            subject = `Siparişiniz İşleniyor ⚙️ #${order.id.substring(0, 8).toUpperCase()}`;
            html = PROCESSING_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate);
            textContent = `Siparişiniz İşleniyor!\n\n${commonTextInfo}`;

        } else if (type === "preparing") {
            subject = `Siparişiniz Hazırlanıyor 📋 #${order.id.substring(0, 8).toUpperCase()}`;
            html = PREPARING_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate);
            textContent = `Siparişiniz Hazırlanıyor!\n\n${commonTextInfo}`;
        } else {
            // Default: order_confirmation
            subject = `Siparişiniz Alındı #${order.id.substring(0, 8).toUpperCase()}`;
            html = ORDER_CONFIRMATION_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SUBTOTAL}}", totals.subtotal.toFixed(2))
                .replace("{{DISCOUNT}}", totals.discount.toFixed(2))
                .replace("{{TAX}}", totals.vat.toFixed(2))
                .replace("{{TOTAL}}", totals.total.toFixed(2))
                .replace("{{SHIPPING_ADDRESS}}", sanitize(addressString))
                .replace("{{BANK_DETAILS}}", bankDetailsHtml) // Explicitly include bank details placeholder
                .replace("{{PAYMENT_METHOD}}", paymentMethod);

            textContent = `Siparişiniz Onaylandı!\n\n${commonTextInfo}\n\nToplam Tutar: ₺${totals.total.toFixed(2)}`;
        }

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
                    "List-Unsubscribe": "<mailto:destek@bravita.com.tr>",
                    "X-Entity-Ref-ID": order.id
                }
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Resend API Error details:", data);
            throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
        }

        console.log("Email sent successfully:", data.id);

        // Log the successful email for rate limiting
        await supabase.from("email_logs").insert({
            order_id: order_id,
            email_type: type,
            recipient: order.user.email,
            sent_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({ success: true, id: data.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Edge Function Error (Caught): ${errorMessage}`);
        // Return 400 with error details to help debugging
        return new Response(JSON.stringify({
            error: "İşlem sırasında bir hata oluştu.",
            details: errorMessage
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
