// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ORDER_CONFIRMATION_HTML } from "./template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
    order_id: string;
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
        const { order_id }: OrderEmailRequest = await req.json();

        if (!order_id) {
            throw new Error("Order ID is required");
        }

        // 1. Fetch Order Details
        // We need to fetch order details, related user (email), and address
        // Since we use 'order_details' JSONB, items are inside it.
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select(`
        *,
        shipping_address:addresses(*),
        user:profiles(email, full_name)
      `)
            .eq("id", order_id)
            .single();

        if (orderError || !order) {
            throw new Error(`Order not found: ${orderError?.message}`);
        }

        // 2. Prepare Data
        const orderDate = new Date(order.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const items = order.order_details.items;
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
        // Note: We don't have product images in JSONB usually, unless we stored them. 
        // Assuming 'product_image' might be missing, we use a placeholder or Bravita bottle if name matches.
        // For now, we will just list text if image is missing.
        // Ideally, pass image url in order_details or fetch from products table. 
        // Let's fetch products to get images if needed? 
        // Optimization: Just use a generic image or the logic from frontend.

        let itemsHtml = "";
        for (const item of items) {
            // Allow generic image for now
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

        // 4. Update Template
        let html = ORDER_CONFIRMATION_HTML
            .replace("{{ORDER_ID}}", order.id.substring(0, 8).toUpperCase())
            .replace("{{ORDER_DATE}}", orderDate)
            .replace("{{ITEMS_LIST}}", itemsHtml)
            .replace("{{SUBTOTAL}}", totals.subtotal.toFixed(2))
            .replace("{{DISCOUNT}}", totals.discount.toFixed(2))
            .replace("{{TAX}}", totals.vat.toFixed(2))
            .replace("{{TOTAL}}", totals.total.toFixed(2))
            .replace("{{SHIPPING_ADDRESS}}", addressString)
            .replace("{{PAYMENT_METHOD}}", paymentMethod);

        // 5. Send Email via Resend
        // Generate Plain Text Version (for better deliverability)
        const textContent = `
Siparişiniz Onaylandı!
Sipariş No: #${order.id.substring(0, 8).toUpperCase()}
Tarih: ${orderDate}

Ürünler:
${items.map(item => `- ${item.product_name} (${item.quantity} adet) : ₺${(item.unit_price * item.quantity).toFixed(2)}`).join('\n')}

Ara Toplam: ₺${totals.subtotal.toFixed(2)}
İndirim: -₺${totals.discount.toFixed(2)}
KDV: ₺${totals.vat.toFixed(2)}
TOPLAM: ₺${totals.total.toFixed(2)}

Teslimat Adresi:
${addressString}

Bravita Ekibi
            `.trim();

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Bravita <noreply@bravita.com.tr>",
                to: [order.user.email],
                subject: `Siparişiniz Onaylandı #${order.id.substring(0, 8).toUpperCase()}`,
                html: html,
                text: textContent, // Needed to avoid MIME_HTML_ONLY penalty
                headers: {
                    "List-Unsubscribe": "<mailto:destek@bravita.com.tr>", // Good practice
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
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
