// @ts-expect-error: Deno URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ORDER_CONFIRMATION_HTML, SHIPPED_HTML, DELIVERED_HTML, CANCELLED_HTML } from "./template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
    order_id: string;
    type?: "order_confirmation" | "shipped" | "delivered" | "cancelled";
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
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { order_id, type = "order_confirmation", tracking_number, shipping_company, cancellation_reason }: OrderEmailRequest = await req.json();

        if (!order_id) {
            throw new Error("Order ID is required");
        }

        // 1. Fetch Order Details
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
        *,
        shipping_address:addresses(*),
        user:profiles(email, full_name, order_notifications)
      `)
            .eq("id", order_id)
            .single();

        if (orderError || !order) {
            throw new Error(`Order not found: ${orderError?.message}`);
        }

        // Check user preferences for notifications
        // We always send 'order_confirmation' as it is a receipt.
        // For other status updates, we check the user's preference.
        if (type !== "order_confirmation" && order.user.order_notifications === false) {
            console.log(`User ${order.user.email} has disabled order notifications. Skipping email for type: ${type}`);
            return new Response(JSON.stringify({ message: "User disabled notifications", skipped: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Prepare Data
        const orderDate = new Date(order.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const items = order.order_details.items as OrderItem[];
        const totals = {
            subtotal: order.order_details.subtotal,
            discount: order.order_details.discount || 0,
            vat: order.order_details.vat_amount,
            total: order.order_details.total,
        };

        const address = order.shipping_address;
        const addressString = `${address.street}, ${address.district || ""}, ${address.city} ${address.postal_code || ""}`;

        const paymentMethod =
            order.payment_method === "credit_card" ? "Kredi Kartı" : "Havale / EFT";

        // 3. Generate Items HTML
        let itemsHtml = "";
        for (const item of items) {
            const imgUrl = "https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-bottle.webp";

            itemsHtml += `
      <tr class="item-row">
          <td width="80" style="padding: 16px 0;">
              <div style="width: 60px; height: 60px; background-color: #F3F4F6; border-radius: 8px; overflow: hidden;">
                  <img src="${imgUrl}" alt="${item.product_name}" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
          </td>
          <td style="padding: 16px 0;">
              <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${item.product_name}</p>
              <p style="margin: 4px 0 0; color: #6B7280; font-size: 13px;">Adet: ${item.quantity}</p>
          </td>
          <td align="right" style="padding: 16px 0;">
              <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">₺${(item.unit_price * item.quantity).toFixed(2)}</p>
          </td>
      </tr>`;
        }

        // 4. Determine Template and Context
        let html = "";
        let subject = "";
        let textContent = ""; // Basic text version

        const commonTextInfo = `
Sipariş No: #${order.id.substring(0, 8).toUpperCase()}
Tarih: ${orderDate}
Ürünler:
${items.map((item) => `- ${item.product_name} (${item.quantity} adet)`).join('\n')}
Teslimat Adresi: ${addressString}
        `;

        if (type === "shipped") {
            // Use passed tracking info or fallback to order data
            const validTrackingNumber = tracking_number || order.tracking_number;
            const validShippingCompany = shipping_company || order.shipping_company || "Kargo Firması";

            if (!validTrackingNumber) {
                // It's possible to mark as shipped without tracking momentarily, but for email we prefer having it.
                // We will still send the email but might show "Bilgi Bekleniyor" if missing, though frontend should prevent this.
            }

            subject = `Siparişiniz Kargoya Verildi 🚚 #${order.id.substring(0, 8).toUpperCase()}`;
            html = SHIPPED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SHIPPING_ADDRESS}}", addressString)
                .replace("{{SHIPPING_COMPANY}}", validShippingCompany)
                .replace("{{TRACKING_NUMBER}}", validTrackingNumber || "Takip numarası girilmedi");

            textContent = `Siparişiniz Kargoya Verildi!\n\nKargo Firması: ${validShippingCompany}\nTakip Numarası: ${validTrackingNumber}\n\n${commonTextInfo}`;

        } else if (type === "delivered") {
            subject = `Siparişiniz Teslim Edildi ✅ #${order.id.substring(0, 8).toUpperCase()}`;
            html = DELIVERED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SHIPPING_ADDRESS}}", addressString);

            textContent = `Siparişiniz Teslim Edildi!\n\nBizi tercih ettiğiniz için teşekkürler.\n\n${commonTextInfo}`;

        } else if (type === "cancelled") {
            subject = `Siparişiniz İptal Edildi ❌ #${order.id.substring(0, 8).toUpperCase()}`;
            const reason = cancellation_reason || order.cancellation_reason || "Belirtilmedi";

            html = CANCELLED_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{CANCELLATION_REASON}}", reason);

            textContent = `Siparişiniz İptal Edildi!\n\nİptal Nedeni: ${reason}\n\n${commonTextInfo}`;

        } else {
            // Default: order_confirmation
            subject = `Siparişiniz Onaylandı #${order.id.substring(0, 8).toUpperCase()}`;
            html = ORDER_CONFIRMATION_HTML
                .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
                .replace("{{ORDER_DATE}}", orderDate)
                .replace("{{ITEMS_LIST}}", itemsHtml)
                .replace("{{SUBTOTAL}}", totals.subtotal.toFixed(2))
                .replace("{{DISCOUNT}}", totals.discount.toFixed(2))
                .replace("{{TAX}}", totals.vat.toFixed(2))
                .replace("{{TOTAL}}", totals.total.toFixed(2))
                .replace("{{SHIPPING_ADDRESS}}", addressString)
                .replace("{{PAYMENT_METHOD}}", paymentMethod);

            textContent = `Siparişiniz Onaylandı!\n\n${commonTextInfo}\n\nToplam Tutar: ₺${totals.total.toFixed(2)}`;
        }

        // 5. Send Email via Resend
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
            throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const err = error as Error;
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
