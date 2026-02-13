/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

interface CardDetailsInput {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

interface InitRequestBody {
  shippingAddressId: string;
  items: Array<{ product_id?: string; id?: string; quantity: number }>;
  installmentNumber: number;
  cardDetails?: CardDetailsInput | null;
  cardToken?: string | null;
  promoCode?: string | null;
  correlationId?: string | null;
}

interface ThreeDPayload {
  redirectUrl: string | null;
  formAction: string | null;
  formFields: JsonRecord | null;
  html: string | null;
  raw: unknown;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.testmoka.com";
const BAKIYEM_DEALER_CODE = Deno.env.get("BAKIYEM_DEALER_CODE") ?? "";
const BAKIYEM_API_USERNAME = Deno.env.get("BAKIYEM_API_USERNAME") ?? "";
const BAKIYEM_API_PASSWORD = Deno.env.get("BAKIYEM_API_PASSWORD") ?? "";
const BAKIYEM_REDIRECT_URL = Deno.env.get("BAKIYEM_REDIRECT_URL") ?? "";
const PAYMENT_CAPTURE_MODE = (Deno.env.get("PAYMENT_CAPTURE_MODE") ?? "direct_3d").toLowerCase();
const PAYMENT_DIRECT_ENABLED = (Deno.env.get("PAYMENT_DIRECT_ENABLED") ?? "true").toLowerCase() === "true";
const DIRECT_CAPTURE_MODES = new Set(["direct", "direct_3d", "direct3d"]);

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const PAYMENT_INIT_RATE_LIMIT_PER_MIN = parsePositiveIntegerEnv("PAYMENT_INIT_RATE_LIMIT_PER_MIN", 5);
const PAYMENT_IDEMPOTENCY_REUSE_SECONDS = parsePositiveIntegerEnv("PAYMENT_IDEMPOTENCY_REUSE_SECONDS", 30);

const DEFAULT_ALLOWED_ORIGINS = [
  "https://bravita.com.tr",
  "https://www.bravita.com.tr",
  "http://localhost:5173",
  "http://localhost:8080",
];

const ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const ACTIVE_ALLOWED_ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ACTIVE_ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (parsed.protocol === "http:" || parsed.protocol === "https:")
    );
  } catch {
    return false;
  }
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = isAllowedOrigin(origin) ? origin : ACTIVE_ALLOWED_ORIGINS[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

function jsonResponse(req: Request, status: number, payload: JsonRecord): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(req),
  });
}

function normalizeItems(items: InitRequestBody["items"]): Array<{ product_id: string; quantity: number }> {
  return items
    .map((item) => ({
      product_id: String(item.product_id ?? item.id ?? "").trim(),
      quantity: Number(item.quantity),
    }))
    .filter((item) => item.product_id.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0)
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

function parseExpiry(expiry: string): { month: string; year: string } | null {
  const cleaned = expiry.replace(/\s/g, "");
  const match = /^(\d{2})\/(\d{2,4})$/.exec(cleaned);
  if (!match) return null;

  const month = match[1];
  let year = match[2];
  if (year.length === 2) year = `20${year}`;
  if (Number(month) < 1 || Number(month) > 12) return null;
  return { month, year };
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function amountFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function maskGatewayRequest(payload: JsonRecord): JsonRecord {
  const masked = structuredClone(payload);
  const request = (masked.PaymentDealerRequest ?? {}) as JsonRecord;
  if (typeof request.CardNumber === "string") request.CardNumber = "****MASKED****";
  if (typeof request.CvcNumber === "string") request.CvcNumber = "***";
  if (typeof request.CardToken === "string") request.CardToken = "***MASKED_TOKEN***";
  if (typeof request.CardHolderFullName === "string") request.CardHolderFullName = "***MASKED***";
  masked.PaymentDealerRequest = request;
  return masked;
}

function parseThreeDPayload(rawData: unknown): ThreeDPayload {
  if (typeof rawData === "string") {
    const trimmed = rawData.trim();
    const looksLikeHtml = trimmed.startsWith("<") || trimmed.toLowerCase().includes("<form");
    if (looksLikeHtml) {
      return {
        redirectUrl: null,
        formAction: null,
        formFields: null,
        html: trimmed,
        raw: rawData,
      };
    }

    return {
      redirectUrl: trimmed,
      formAction: null,
      formFields: null,
      html: null,
      raw: rawData,
    };
  }

  if (rawData && typeof rawData === "object") {
    const data = rawData as JsonRecord;
    return {
      redirectUrl: (data.Url ?? data.RedirectUrl ?? data.RedirectURL ?? null) as string | null,
      formAction: (data.FormAction ?? null) as string | null,
      formFields: (data.FormFields ?? data.InputFields ?? null) as JsonRecord | null,
      html: (data.Html ?? data.ThreeDSecureHtml ?? data.ThreeDHtml ?? null) as string | null,
      raw: rawData,
    };
  }

  return {
    redirectUrl: null,
    formAction: null,
    formFields: null,
    html: null,
    raw: rawData,
  };
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function extractUserJwt(req: Request): string | null {
  const customHeader = req.headers.get("x-user-jwt");
  if (customHeader && customHeader.trim().length > 0) {
    return customHeader.replace(/^Bearer\s+/i, "").trim();
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { success: false, message: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(req, 500, { success: false, message: "Server config missing" });
  }

  if (!BAKIYEM_REDIRECT_URL || !BAKIYEM_DEALER_CODE || !BAKIYEM_API_USERNAME || !BAKIYEM_API_PASSWORD) {
    return jsonResponse(req, 500, { success: false, message: "Bakiyem config missing" });
  }

  if (!PAYMENT_DIRECT_ENABLED || !DIRECT_CAPTURE_MODES.has(PAYMENT_CAPTURE_MODE)) {
    return jsonResponse(req, 503, { success: false, message: "Kart odeme gecici olarak pasif" });
  }

  try {
    const token = extractUserJwt(req);
    if (!token) {
      return jsonResponse(req, 401, { success: false, message: "Unauthorized" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(req, 401, { success: false, message: "Unauthorized" });
    }

    const userId = authData.user.id;
    const body = (await req.json()) as InitRequestBody;

    if (!body.shippingAddressId) {
      return jsonResponse(req, 400, { success: false, message: "shippingAddressId zorunlu" });
    }

    if (!Number.isInteger(body.installmentNumber) || body.installmentNumber < 1 || body.installmentNumber > 12) {
      return jsonResponse(req, 400, { success: false, message: "Taksit sayisi 1..12 olmali" });
    }

    const normalizedItems = normalizeItems(body.items ?? []);
    if (normalizedItems.length === 0) {
      return jsonResponse(req, 400, { success: false, message: "Sepet bos veya gecersiz" });
    }

    const cardToken = String(body.cardToken ?? "").trim();
    const usesCardToken = cardToken.length > 0;
    const parsedExpiry = usesCardToken ? null : parseExpiry(body.cardDetails?.expiry ?? "");
    if (
      !usesCardToken &&
      (!parsedExpiry || !body.cardDetails?.name || !body.cardDetails?.number || !body.cardDetails?.cvv)
    ) {
      return jsonResponse(req, 400, { success: false, message: "Kart bilgileri gecersiz" });
    }

    const rateLimitSince = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentInitCount } = await supabase
      .from("payment_intents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("payment_method", "credit_card")
      .gte("created_at", rateLimitSince);

    if ((recentInitCount ?? 0) >= PAYMENT_INIT_RATE_LIMIT_PER_MIN) {
      return jsonResponse(req, 429, { success: false, message: "Cok fazla deneme, lutfen bekleyin" });
    }

    const quotePayload = {
      p_user_id: userId,
      p_items: normalizedItems,
      p_shipping_address_id: body.shippingAddressId,
      p_payment_method: "credit_card",
      p_installment_number: body.installmentNumber,
      p_promo_code: body.promoCode ?? null,
    };

    const { data: quoteData, error: quoteError } = await supabase.rpc("calculate_order_quote_v1", quotePayload);
    if (quoteError || !quoteData?.success) {
      return jsonResponse(req, 400, {
        success: false,
        message: quoteError?.message ?? quoteData?.message ?? "Quote olusturulamadi",
      });
    }

    const cartHash = await sha256Hex(JSON.stringify(normalizedItems));
    const nowMs = Date.now();
    const dayBucket = Math.floor(nowMs / (24 * 60 * 60 * 1000));
    const reuseWindowMs = PAYMENT_IDEMPOTENCY_REUSE_SECONDS * 1000;
    const slotBucket = Math.floor(nowMs / reuseWindowMs);
    const idempotencySource = `${userId}:${cartHash}:${body.shippingAddressId}:${body.installmentNumber}:${quoteData.rate_version ?? "v1"}:${dayBucket}:${slotBucket}`;
    const idempotencyKey = await sha256Hex(idempotencySource);
    const idempotencyExpiresAt = new Date(nowMs + reuseWindowMs).toISOString();

    const { data: existingIntentRows } = await supabase
      .from("payment_intents")
      .select("id, idempotency_expires_at, status, threed_payload_encrypted")
      .eq("idempotency_key", idempotencyKey)
      .eq("user_id", userId)
      .limit(1);

    const existingIntent = existingIntentRows?.[0];
    const nowIso = new Date().toISOString();
    if (
      existingIntent &&
      existingIntent.idempotency_expires_at > nowIso &&
      (existingIntent.status === "pending" || existingIntent.status === "awaiting_3d")
    ) {
      if (typeof existingIntent.threed_payload_encrypted === "string" && existingIntent.threed_payload_encrypted.length > 0) {
        try {
          const reusedPayload = JSON.parse(decodeBase64Utf8(existingIntent.threed_payload_encrypted));
          return jsonResponse(req, 200, {
            success: true,
            intentId: existingIntent.id,
            reused: true,
            threeD: reusedPayload,
          });
        } catch {
          // Fall through and return conflict so the client can restart the flow safely.
        }
      }

      return jsonResponse(req, 409, {
        success: false,
        message: "Bu odeme denemesi zaten isleniyor",
        intentId: existingIntent.id,
      });
    }

    const pricingSnapshot = {
      ...quoteData,
      shipping_address_id: body.shippingAddressId,
      promo_code: body.promoCode ?? null,
      quote_version: quoteData.rate_version ?? "v1",
      calculated_at: nowIso,
      correlation_id: body.correlationId ?? null,
      capture_source: usesCardToken ? "card_token" : "card_details",
    };

    let intentId = "";
    const intentInsertResult = await supabase
      .from("payment_intents")
      .insert({
        user_id: userId,
        shipping_address_id: body.shippingAddressId,
        payment_method: "credit_card",
        status: "pending",
        idempotency_key: idempotencyKey,
        idempotency_expires_at: idempotencyExpiresAt,
        currency: "TL",
        item_total_cents: quoteData.item_total_cents,
        vat_total_cents: quoteData.vat_total_cents,
        shipping_total_cents: quoteData.shipping_total_cents,
        discount_total_cents: quoteData.discount_total_cents,
        base_total_cents: quoteData.base_total_cents,
        commission_rate: quoteData.commission_rate,
        commission_amount_cents: quoteData.commission_amount_cents,
        paid_total_cents: quoteData.paid_total_cents,
        installment_number: quoteData.installment_number,
        cart_snapshot: quoteData.cart_snapshot,
        pricing_snapshot: pricingSnapshot,
        provider: "bakiyem",
        merchant_ref: null,
        return_url: BAKIYEM_REDIRECT_URL,
        fail_url: BAKIYEM_REDIRECT_URL,
      })
      .select("id")
      .single();

    if (intentInsertResult.error) {
      if (intentInsertResult.error.code !== "23505") {
        return jsonResponse(req, 500, { success: false, message: "Payment intent olusturulamadi" });
      }

      const { data: raceIntent } = await supabase
        .from("payment_intents")
        .select("id, threed_payload_encrypted, status")
        .eq("idempotency_key", idempotencyKey)
        .eq("user_id", userId)
        .maybeSingle();

      if (
        raceIntent?.id &&
        (raceIntent.status === "pending" || raceIntent.status === "awaiting_3d") &&
        typeof raceIntent.threed_payload_encrypted === "string"
      ) {
        try {
          const reusedPayload = JSON.parse(decodeBase64Utf8(raceIntent.threed_payload_encrypted));
          return jsonResponse(req, 200, {
            success: true,
            intentId: raceIntent.id,
            reused: true,
            threeD: reusedPayload,
          });
        } catch {
          // Fall through to conflict response when payload decode fails.
        }
      }

      return jsonResponse(req, 409, { success: false, message: "Odeme istegi zaten olusturuldu" });
    }

    intentId = intentInsertResult.data.id;

    const reserveResult = await supabase.rpc("reserve_stock_for_intent_v1", {
      p_intent_id: intentId,
      p_ttl_minutes: 15,
    });

    if (reserveResult.error || !reserveResult.data?.success) {
      await supabase
        .from("payment_intents")
        .update({ status: "failed", gateway_status: "reserve_failed" })
        .eq("id", intentId);

      return jsonResponse(req, 409, { success: false, message: "Stok rezervasyonu basarisiz" });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const paymentAmount = amountFromCents(Number(quoteData.paid_total_cents));

    const cardNumberClean = usesCardToken ? "" : body.cardDetails?.number?.replace(/\s/g, "") ?? "";
    const redirectUrl = new URL(BAKIYEM_REDIRECT_URL);
    redirectUrl.searchParams.set("intentId", intentId);

    const paymentDealerRequest: JsonRecord = {
      Amount: paymentAmount,
      Currency: "TL",
      InstallmentNumber: body.installmentNumber,
      ClientIP: clientIp,
      OtherTrxCode: intentId,
      IsPreAuth: 0,
      IsPoolPayment: 0,
      RedirectUrl: redirectUrl.toString(),
      Description: `Bravita checkout ${intentId}`,
    };

    if (usesCardToken) {
      paymentDealerRequest.CardToken = cardToken;
    } else {
      paymentDealerRequest.CardHolderFullName = body.cardDetails?.name?.trim() ?? "";
      paymentDealerRequest.CardNumber = cardNumberClean;
      paymentDealerRequest.ExpMonth = parsedExpiry?.month ?? "";
      paymentDealerRequest.ExpYear = parsedExpiry?.year ?? "";
      paymentDealerRequest.CvcNumber = body.cardDetails?.cvv ?? "";
    }

    const gatewayRequest: JsonRecord = {
      PaymentDealerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey,
      },
      PaymentDealerRequest: paymentDealerRequest,
    };

    const gatewayResponseRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoDirectPaymentThreeD`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gatewayRequest),
    });

    const gatewayResponseJson = await gatewayResponseRaw.json().catch(() => ({}));

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "init_3d",
      request_payload: maskGatewayRequest(gatewayRequest),
      response_payload: gatewayResponseJson,
      success: gatewayResponseRaw.ok && gatewayResponseJson?.ResultCode === "Success",
      error_code: gatewayResponseJson?.ResultCode ?? null,
      error_message: gatewayResponseJson?.ResultMessage ?? null,
    });

    if (!gatewayResponseRaw.ok || gatewayResponseJson?.ResultCode !== "Success" || !gatewayResponseJson?.Data) {
      await supabase.rpc("release_intent_reservations_v1", { p_intent_id: intentId, p_new_status: "failed" });
      await supabase
        .from("payment_intents")
        .update({
          status: "failed",
          gateway_status: String(gatewayResponseJson?.ResultCode ?? "gateway_error"),
        })
        .eq("id", intentId);

      return jsonResponse(req, 400, {
        success: false,
        message: gatewayResponseJson?.ResultMessage ?? "3D baslatma basarisiz",
      });
    }

    const threeDPayload = parseThreeDPayload(gatewayResponseJson.Data);

    if (!threeDPayload.redirectUrl && !threeDPayload.formAction && !threeDPayload.html) {
      await supabase.rpc("release_intent_reservations_v1", { p_intent_id: intentId, p_new_status: "failed" });
      await supabase
        .from("payment_intents")
        .update({ status: "failed", gateway_status: "invalid_3d_payload" })
        .eq("id", intentId);

      return jsonResponse(req, 400, {
        success: false,
        message: "3D yonlendirme verisi gecersiz",
      });
    }

    const providerRoot = gatewayResponseJson as JsonRecord;
    await supabase
      .from("payment_intents")
      .update({
        status: "awaiting_3d",
        merchant_ref: intentId,
        gateway_status: String(gatewayResponseJson.ResultCode),
        gateway_trx_code: String(providerRoot.TrxCode ?? ""),
        threed_payload_encrypted: encodeBase64Utf8(JSON.stringify(threeDPayload)),
        encryption_key_version: "plain_v1",
      })
      .eq("id", intentId);

    return jsonResponse(req, 200, {
      success: true,
      intentId,
      reused: false,
      threeD: threeDPayload,
    });
  } catch (error) {
    console.error("bakiyem-init-3d failed", error);
    return jsonResponse(req, 500, { success: false, message: "Odeme baslatilamadi" });
  }
});
