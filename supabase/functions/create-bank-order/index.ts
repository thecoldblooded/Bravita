/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  getCorsHeaders,
  getStringField,
  getUserFromRequest,
  jsonResponse,
  readJsonBody,
} from "../_shared/edge-security.ts";

function normalizeItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const normalized = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const productId = typeof record.product_id === "string" ? record.product_id.trim() : "";
    const quantity = Number(record.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) return null;
    return { product_id: productId, quantity };
  });

  return normalized.every(Boolean) ? normalized : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { success: false, error: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req, 24_576);
    const supabase = createServiceClient();
    const user = await getUserFromRequest(req, supabase);
    if (!user?.id) {
      return jsonResponse(req, 401, { success: false, error: "AUTH_SESSION_REQUIRED", message: "Oturum gerekli" });
    }

    const items = normalizeItems(body.items);
    const shippingAddressId = getStringField(body, "shippingAddressId");
    if (!items || !shippingAddressId) {
      return jsonResponse(req, 400, { success: false, error: "INVALID_ORDER_REQUEST", message: "Sipariş bilgileri geçersiz" });
    }

    const promoCode = getStringField(body, "promoCode");
    const { data, error } = await supabase.rpc("create_order_for_user_v1", {
      p_user_id: user.id,
      p_items: items,
      p_shipping_address_id: shippingAddressId,
      p_payment_method: "bank_transfer",
      p_promo_code: promoCode || null,
    });

    if (error) {
      return jsonResponse(req, 400, { success: false, error: "ORDER_RPC_ERROR", message: "Sipariş oluşturulamadı" });
    }

    return jsonResponse(req, 200, data ?? { success: false, error: "ORDER_RPC_EMPTY", message: "Sipariş oluşturulamadı" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    return jsonResponse(req, status, { success: false, error: "REQUEST_ERROR", message: "İstek işlenemedi" });
  }
});

