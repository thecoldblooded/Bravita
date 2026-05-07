// @ts-nocheck
import {
  createServiceClient,
  getCorsHeaders,
  getStringField,
  getUserFromRequest,
  jsonResponse,
  readJsonBody,
} from "../_shared/edge-security.ts";

const ORDER_STATUSES = new Set(["pending", "processing", "preparing", "shipped", "delivered", "cancelled"]);
const PRODUCT_FIELDS = new Set([
  "name",
  "slug",
  "price",
  "original_price",
  "stock",
  "max_quantity_per_order",
  "description",
  "image_url",
  "is_active",
]);
const PROMO_CODE_FIELDS = new Set([
  "code",
  "discount_type",
  "discount_value",
  "min_order_amount",
  "max_discount_amount",
  "start_date",
  "end_date",
  "usage_limit",
  "is_active",
]);

type ServiceClient = ReturnType<typeof createServiceClient>;
type JsonRecord = Record<string, unknown>;

function emitOperationalAlert(event: string, context: JsonRecord) {
  console.error(JSON.stringify({
    severity: "critical",
    service: "admin-rpc",
    event,
    ...context,
  }));
}

async function getAdminProfile(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin,is_superadmin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { isAdmin: false, isSuperadmin: false };
  return {
    isAdmin: data?.is_admin === true || data?.is_superadmin === true,
    isSuperadmin: data?.is_superadmin === true,
  };
}

function getRecordField(body: JsonRecord, key: string): JsonRecord | null {
  const value = body[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function getFiniteNumber(value: unknown): number | null {
  const normalized = typeof value === "string" ? Number(value) : value;
  return typeof normalized === "number" && Number.isFinite(normalized) ? normalized : null;
}

function pickAllowedFields(input: JsonRecord, allowedFields: Set<string>): JsonRecord {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => allowedFields.has(key) && value !== undefined),
  );
}

function sanitizeProductPayload(input: JsonRecord, { requireCoreFields }: { requireCoreFields: boolean }): JsonRecord | null {
  const payload = pickAllowedFields(input, PRODUCT_FIELDS);

  if ("price" in payload) payload.price = getFiniteNumber(payload.price);
  if ("original_price" in payload) payload.original_price = payload.original_price === null ? null : getFiniteNumber(payload.original_price);
  if ("stock" in payload) payload.stock = getFiniteNumber(payload.stock);
  if ("max_quantity_per_order" in payload) payload.max_quantity_per_order = getFiniteNumber(payload.max_quantity_per_order);

  if ("is_active" in payload) payload.is_active = payload.is_active === true;
  if (!("is_active" in payload) && requireCoreFields) payload.is_active = true;

  if (requireCoreFields) {
    if (!getStringField(payload, "name") || !getStringField(payload, "slug")) return null;
    if (getFiniteNumber(payload.price) === null || getFiniteNumber(payload.stock) === null) return null;
    if (getFiniteNumber(payload.max_quantity_per_order) === null) payload.max_quantity_per_order = 10;
  }

  for (const key of ["price", "stock", "max_quantity_per_order"]) {
    if (key in payload && getFiniteNumber(payload[key]) === null) return null;
  }

  return payload;
}

function sanitizePromoCodePayload(input: JsonRecord, { requireCoreFields }: { requireCoreFields: boolean }): JsonRecord | null {
  const payload = pickAllowedFields(input, PROMO_CODE_FIELDS);

  if ("discount_value" in payload) payload.discount_value = getFiniteNumber(payload.discount_value);
  if ("min_order_amount" in payload) payload.min_order_amount = payload.min_order_amount === null ? null : getFiniteNumber(payload.min_order_amount);
  if ("max_discount_amount" in payload) payload.max_discount_amount = payload.max_discount_amount === null ? null : getFiniteNumber(payload.max_discount_amount);
  if ("usage_limit" in payload) payload.usage_limit = payload.usage_limit === null ? null : getFiniteNumber(payload.usage_limit);
  if ("is_active" in payload) payload.is_active = payload.is_active === true;
  if (!("is_active" in payload) && requireCoreFields) payload.is_active = true;

  const discountType = getStringField(payload, "discount_type");
  if ("discount_type" in payload && !["percentage", "fixed_amount"].includes(discountType)) return null;

  if (requireCoreFields) {
    if (!getStringField(payload, "code")) return null;
    if (!["percentage", "fixed_amount"].includes(discountType)) return null;
    if (getFiniteNumber(payload.discount_value) === null) return null;
  }

  if ("discount_value" in payload && getFiniteNumber(payload.discount_value) === null) return null;

  return payload;
}

async function auditAdminAction(
  supabase: ServiceClient,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string | null,
  details: JsonRecord,
  requestId: string,
): Promise<boolean> {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_user_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    details,
  });

  if (error) {
    emitOperationalAlert("ADMIN_AUDIT_INSERT_FAILED", {
      requestId,
      actorId,
      action,
      targetTable,
      targetId,
      error: error.message,
    });
    return false;
  }

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  const requestId = crypto.randomUUID();

  try {
    const body = await readJsonBody(req, 16_384);
    const action = getStringField(body, "action");
    const supabase = createServiceClient();
    const user = await getUserFromRequest(req, supabase);
    if (!user?.id) {
      return jsonResponse(req, 401, { error: "Unauthorized" });
    }

    const profile = await getAdminProfile(supabase, user.id);
    if (!profile.isAdmin) {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    if (action === "updateOrderStatus") {
      const orderId = getStringField(body, "orderId");
      const status = getStringField(body, "status");
      const note = getStringField(body, "note");
      if (!orderId || !ORDER_STATUSES.has(status)) {
        return jsonResponse(req, 400, { error: "Invalid order status request" });
      }

      const { data, error } = await supabase.rpc("admin_update_order_status_for_actor_v1", {
        p_actor_id: user.id,
        p_order_id: orderId,
        p_new_status: status,
        p_note: note || null,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Order status update failed" });
      return jsonResponse(req, 200, { success: data === true });
    }

    if (action === "getDashboardStats") {
      const startDate = getStringField(body, "startDate");
      const endDate = getStringField(body, "endDate");
      if (!startDate || !endDate) {
        return jsonResponse(req, 400, { error: "Invalid dashboard date range" });
      }

      const { data, error } = await supabase.rpc("get_dashboard_stats_v2_for_actor_v1", {
        p_actor_id: user.id,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Dashboard stats failed" });
      return jsonResponse(req, 200, { success: true, data });
    }

    if (action === "updateSiteSettings") {
      const settings = getRecordField(body, "settings");
      if (!settings) return jsonResponse(req, 400, { error: "Invalid site settings request" });

      const payload = {
        vat_rate: getFiniteNumber(settings.vat_rate),
        shipping_cost: getFiniteNumber(settings.shipping_cost),
        free_shipping_threshold: getFiniteNumber(settings.free_shipping_threshold),
        bank_name: getStringField(settings, "bank_name"),
        bank_iban: getStringField(settings, "bank_iban"),
        bank_account_holder: getStringField(settings, "bank_account_holder"),
        updated_at: new Date().toISOString(),
      };

      if (
        payload.vat_rate === null ||
        payload.shipping_cost === null ||
        payload.free_shipping_threshold === null
      ) {
        return jsonResponse(req, 400, { error: "Invalid site settings payload" });
      }

      const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
      if (error) return jsonResponse(req, 400, { error: error.message || "Site settings update failed" });
      await auditAdminAction(supabase, user.id, "UPDATE_SETTINGS", "site_settings", "1", payload, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "confirmPayment") {
      const orderId = getStringField(body, "orderId");
      if (!orderId) return jsonResponse(req, 400, { error: "Invalid order" });

      const { error: paymentError } = await supabase
        .from("orders")
        .update({ payment_status: "paid", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (paymentError) return jsonResponse(req, 400, { error: paymentError.message || "Payment confirmation failed" });

      const { error: statusError } = await supabase.rpc("admin_update_order_status_for_actor_v1", {
        p_actor_id: user.id,
        p_order_id: orderId,
        p_new_status: "processing",
        p_note: "Ödeme havale ile alındı, onaylandı.",
      });

      if (statusError) return jsonResponse(req, 400, { error: statusError.message || "Order status update failed" });
      await auditAdminAction(supabase, user.id, "CONFIRM_PAYMENT", "orders", orderId, {
        method: "bank_transfer",
        payment_status: "paid",
        new_status: "processing",
      }, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "updateTrackingNumber") {
      const orderId = getStringField(body, "orderId");
      const trackingNumber = getStringField(body, "trackingNumber");
      const shippingCompany = getStringField(body, "shippingCompany");
      if (!orderId || !trackingNumber) return jsonResponse(req, 400, { error: "Invalid tracking request" });

      const payload = {
        tracking_number: trackingNumber,
        shipping_company: shippingCompany || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
      if (error) return jsonResponse(req, 400, { error: error.message || "Tracking update failed" });
      await auditAdminAction(supabase, user.id, "UPDATE_TRACKING", "orders", orderId, payload, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "addProduct") {
      const product = getRecordField(body, "product");
      if (!product) return jsonResponse(req, 400, { error: "Invalid product request" });
      const payload = sanitizeProductPayload(product, { requireCoreFields: true });
      if (!payload) return jsonResponse(req, 400, { error: "Invalid product payload" });

      const { data, error } = await supabase
        .from("products")
        .insert({ ...payload, reserved_stock: 0 })
        .select()
        .single();

      if (error) return jsonResponse(req, 400, { error: error.message || "Product create failed" });
      await auditAdminAction(supabase, user.id, "CREATE_PRODUCT", "products", String(data.id), payload, requestId);
      return jsonResponse(req, 200, { success: true, data, requestId });
    }

    if (action === "updateProduct" || action === "updateProductStock") {
      const productId = getStringField(body, "productId");
      const updates = action === "updateProductStock"
        ? { stock: getFiniteNumber(body.stock) }
        : sanitizeProductPayload(getRecordField(body, "updates") ?? {}, { requireCoreFields: false });

      if (!productId || !updates || Object.keys(updates).length === 0 || ("stock" in updates && updates.stock === null)) {
        return jsonResponse(req, 400, { error: "Invalid product update request" });
      }

      const payload = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) return jsonResponse(req, 400, { error: error.message || "Product update failed" });
      await auditAdminAction(supabase, user.id, action === "updateProductStock" ? "UPDATE_PRODUCT_STOCK" : "UPDATE_PRODUCT", "products", productId, payload, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "deleteProduct") {
      const productId = getStringField(body, "productId");
      if (!productId) return jsonResponse(req, 400, { error: "Invalid product delete request" });
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) return jsonResponse(req, 400, { error: error.message || "Product delete failed" });
      await auditAdminAction(supabase, user.id, "DELETE_PRODUCT", "products", productId, {}, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "addPromoCode") {
      const promoCode = getRecordField(body, "promoCode");
      if (!promoCode) return jsonResponse(req, 400, { error: "Invalid promo code request" });
      const payload = sanitizePromoCodePayload(promoCode, { requireCoreFields: true });
      if (!payload) return jsonResponse(req, 400, { error: "Invalid promo code payload" });

      const { data, error } = await supabase.from("promo_codes").insert(payload).select().single();
      if (error) return jsonResponse(req, 400, { error: error.message || "Promo code create failed" });
      await auditAdminAction(supabase, user.id, "CREATE_PROMO_CODE", "promo_codes", String(data.id), payload, requestId);
      return jsonResponse(req, 200, { success: true, data, requestId });
    }

    if (action === "updatePromoCode") {
      const promoCodeId = getStringField(body, "promoCodeId");
      const updates = sanitizePromoCodePayload(getRecordField(body, "updates") ?? {}, { requireCoreFields: false });
      if (!promoCodeId || !updates || Object.keys(updates).length === 0) {
        return jsonResponse(req, 400, { error: "Invalid promo code update request" });
      }

      const { data, error } = await supabase.from("promo_codes").update(updates).eq("id", promoCodeId).select().single();
      if (error) return jsonResponse(req, 400, { error: error.message || "Promo code update failed" });
      await auditAdminAction(supabase, user.id, "UPDATE_PROMO_CODE", "promo_codes", promoCodeId, updates, requestId);
      return jsonResponse(req, 200, { success: true, data, requestId });
    }

    if (action === "deletePromoCode") {
      const promoCodeId = getStringField(body, "promoCodeId");
      if (!promoCodeId) return jsonResponse(req, 400, { error: "Invalid promo code delete request" });
      const { error } = await supabase.from("promo_codes").delete().eq("id", promoCodeId);
      if (error) return jsonResponse(req, 400, { error: error.message || "Promo code delete failed" });
      await auditAdminAction(supabase, user.id, "DELETE_PROMO_CODE", "promo_codes", promoCodeId, {}, requestId);
      return jsonResponse(req, 200, { success: true, requestId });
    }

    if (action === "syncUserAdminStatus") {
      if (!profile.isSuperadmin) {
        return jsonResponse(req, 403, { error: "Forbidden" });
      }

      const targetUserId = getStringField(body, "userId");
      const isAdmin = body.isAdmin === true;
      if (!targetUserId) {
        return jsonResponse(req, 400, { error: "Invalid target user" });
      }

      const { error } = await supabase.rpc("sync_user_admin_status_for_actor_v1", {
        p_actor_id: user.id,
        p_user_id: targetUserId,
        p_is_admin: isAdmin,
      });

      if (error) return jsonResponse(req, 400, { error: error.message || "Admin sync failed" });
      return jsonResponse(req, 200, { success: true });
    }

    return jsonResponse(req, 400, { error: "Unknown action" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    emitOperationalAlert("ADMIN_RPC_UNHANDLED_ERROR", {
      requestId,
      error: message,
    });
    return jsonResponse(req, status, { error: "Request could not be processed", requestId });
  }
});
