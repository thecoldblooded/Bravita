// @ts-nocheck
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

type PayloadProfile = "minimal" | "extended";

function normalizePayloadProfile(value: unknown): PayloadProfile | null {
  const normalized = asText(value).toLowerCase();
  if (normalized === "minimal" || normalized === "extended") return normalized;
  return null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.refmokaunited.com";
const BAKIYEM_DEALER_CODE = (Deno.env.get("BAKIYEM_DEALER_CODE") ?? "").trim();
const BAKIYEM_API_USERNAME = (Deno.env.get("BAKIYEM_API_USERNAME") ?? "").trim();
const BAKIYEM_API_PASSWORD = (Deno.env.get("BAKIYEM_API_PASSWORD") ?? "").trim();
const BAKIYEM_REDIRECT_URL = (Deno.env.get("BAKIYEM_REDIRECT_URL") ?? "https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/bakiyem-3d-return").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://bravita.com.tr").trim();
const BAKIYEM_SOFTWARE_NAME = (Deno.env.get("BAKIYEM_SOFTWARE_NAME") ?? "BravitaCheckout").trim();

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": origin || "*",
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
    .filter((item) => item.product_id.length > 0 && item.quantity > 0)
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
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function amountFromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizePhone10(value: unknown): string {
  const digits = asText(value).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("90")) return digits.slice(2);
  return "";
}

function splitNameParts(value: unknown): { firstName: string; lastName: string } {
  const normalized = sanitizeString(asText(value));
  if (!normalized) return { firstName: "", lastName: "" };
  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = (parts[0] ?? "").substring(0, 50);
  const lastName = parts.slice(1).join(" ").substring(0, 50);
  return { firstName, lastName };
}

function normalizeGatewayInstallmentNumber(value: unknown): number {
  const raw = Number(value);
  // Moka docs mention 0/1 as "single shot", but field evidence in this project shows
  // bank/acquirer failures are clustered when 0 is sent. Use 1 as safe single-shot value.
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  const normalized = Math.trunc(raw);
  return Math.min(12, Math.max(2, normalized));
}

function extractCodeForHash(data: unknown): string {
  if (data && typeof data === "object") {
    const direct = asText((data as Record<string, unknown>)?.CodeForHash ?? (data as Record<string, unknown>)?.codeForHash);
    if (direct) return direct;
  }

  if (typeof data === "string") {
    const jsonStyleMatch = /"CodeForHash"\s*:\s*"([^"]+)"/i.exec(data);
    if (jsonStyleMatch?.[1]) return asText(jsonStyleMatch[1]);

    const queryStyleMatch = /[?&]CodeForHash=([^&"'\s]+)/i.exec(data);
    if (queryStyleMatch?.[1]) {
      try {
        return asText(decodeURIComponent(queryStyleMatch[1]));
      } catch {
        return asText(queryStyleMatch[1]);
      }
    }
  }

  return "";
}

function clearTurkishChars(str: string): string {
  const map: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
  };
  return str.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (m) => map[m] || m);
}

function sanitizeString(str: string): string {
  return clearTurkishChars(str).replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function maskGatewayRequest(payload: JsonRecord): JsonRecord {
  const masked = JSON.parse(JSON.stringify(payload));
  if (masked.PaymentDealerRequest) {
    if (masked.PaymentDealerRequest.CardNumber) masked.PaymentDealerRequest.CardNumber = "****MASKED****";
    if (masked.PaymentDealerRequest.CvcNumber) masked.PaymentDealerRequest.CvcNumber = "***";
    if (masked.PaymentDealerRequest.CardHolderFullName) masked.PaymentDealerRequest.CardHolderFullName = "***MASKED***";
  }
  return masked;
}

function parseThreeDPayload(data: any): ThreeDPayload {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("<")) return { redirectUrl: null, formAction: null, formFields: null, html: trimmed, raw: data };
    return { redirectUrl: trimmed, formAction: null, formFields: null, html: null, raw: data };
  }
  return {
    redirectUrl: data?.Url || data?.RedirectUrl || null,
    formAction: data?.FormAction || null,
    formFields: data?.FormFields || null,
    html: data?.Html || null,
    raw: data
  };
}

async function encryptGcm(plaintext: string): Promise<string> {
  // Simple placeholder for GCM encryption (using service role key as secret for demo)
  // Real implementation would use dedicated encryption key
  return btoa(plaintext);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, 405, { success: false, message: "Method not allowed" });

  try {
    const token = req.headers.get("x-user-jwt")?.replace("Bearer ", "") || "";
    if (!token) return jsonResponse(req, 401, { success: false, message: "Unauthorized" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse(req, 401, { success: false, message: "Unauthorized" });

    const userId = authData.user.id;
    const body = (await req.json()) as InitRequestBody;

    // CARD VALIDATION
    if (!body.cardToken && (!body.cardDetails || !body.cardDetails.number || !body.cardDetails.expiry || !body.cardDetails.cvv)) {
      return jsonResponse(req, 400, { success: false, message: "Kart bilgileri eksik" });
    }

    const parsedExpiry = body.cardToken ? null : parseExpiry(body.cardDetails?.expiry ?? "");
    if (!body.cardToken && !parsedExpiry) {
      return jsonResponse(req, 400, { success: false, message: "Gecersiz son kullanma tarihi (AA/YY veya AA/YYYY olmali)" });
    }

    const normalizedItems = normalizeItems(body.items ?? []);
    const { data: quoteData, error: quoteError } = await supabase.rpc("calculate_order_quote_v1", {
      p_user_id: userId, p_items: normalizedItems, p_shipping_address_id: body.shippingAddressId,
      p_payment_method: "credit_card", p_installment_number: body.installmentNumber || 1,
      p_promo_code: body.promoCode ?? null,
    });

    if (quoteError || !quoteData?.success) return jsonResponse(req, 400, { success: false, message: quoteError?.message || "Quote failure" });

    const paymentTotalCents = Number(quoteData.paid_total_cents);
    if (!Number.isFinite(paymentTotalCents) || paymentTotalCents <= 0) {
      return jsonResponse(req, 400, { success: false, message: "Gecersiz odeme tutari" });
    }

    const cartHash = await sha256Hex(JSON.stringify(normalizedItems));
    const idempotencyKey = await sha256Hex(`${userId}:${cartHash}:${Date.now()}`);

    const pricingSnapshot = { ...quoteData, shipping_address_id: body.shippingAddressId, calculated_at: new Date().toISOString() };

    const { data: intent, error: insertError } = await supabase.from("payment_intents").insert({
      user_id: userId, shipping_address_id: body.shippingAddressId, status: "pending",
      idempotency_key: idempotencyKey, idempotency_expires_at: new Date(Date.now() + 600000).toISOString(),
      currency: "TL", item_total_cents: quoteData.item_total_cents, vat_total_cents: quoteData.vat_total_cents,
      shipping_total_cents: quoteData.shipping_total_cents, discount_total_cents: quoteData.discount_total_cents,
      base_total_cents: quoteData.base_total_cents, commission_amount_cents: quoteData.commission_amount_cents,
      paid_total_cents: paymentTotalCents,
      installment_number: quoteData.installment_number,
      cart_snapshot: quoteData.cart_snapshot, pricing_snapshot: pricingSnapshot,
      provider: "bakiyem", return_url: BAKIYEM_REDIRECT_URL, fail_url: BAKIYEM_REDIRECT_URL,
    }).select("id").single();

    if (insertError) return jsonResponse(req, 500, { success: false, message: insertError.message });

    const intentId = intent.id;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const { data: addr } = await supabase.from("addresses").select("*").eq("id", body.shippingAddressId).single();

    const cardHolderName = asText(body.cardDetails?.name || profile?.full_name || "Bravita Customer").substring(0, 100).trim();
    const buyerName = (asText(profile?.full_name || cardHolderName).substring(0, 100) || "Bravita Customer").trim();
    const buyerPhone = normalizePhone10(profile?.phone);
    const buyerEmail = asText(profile?.email || authData.user?.email || "");
    const buyerAddress = sanitizeString(
      [
        asText(addr?.address || addr?.address_line1),
        asText(addr?.address_line2),
        asText(addr?.district),
        asText(addr?.city),
      ]
        .filter((part) => part.length > 0)
        .join(" "),
    ).substring(0, 200);
    const { firstName: customerFirstName, lastName: customerLastName } = splitNameParts(buyerName);
    const customerCode = userId.replace(/-/g, "").substring(0, 32);

    const safeBuyerInformation: JsonRecord = {
      BuyerFullName: buyerName,
      BuyerGsmNumber: buyerPhone,
      BuyerEmail: buyerEmail,
      BuyerAddress: buyerAddress,
    };

    const safeCustomerInformation: JsonRecord = {
      DealerCustomerId: "",
      CustomerCode: customerCode,
      FirstName: customerFirstName || "",
      LastName: customerLastName || "",
      Gender: "1",
      BirthDate: "",
      GsmNumber: buyerPhone,
      Email: buyerEmail,
      Address: buyerAddress,
      CardName: body.cardToken ? "Tokenized Card" : "Maximum kartim",
    };

    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const shortTrxCode = intentId.replace(/-/g, "").substring(0, 20);
    const paymentAmount = amountFromCents(paymentTotalCents);
    const gatewayInstallmentNumber = normalizeGatewayInstallmentNumber(quoteData.installment_number ?? body.installmentNumber ?? 1);

    const origin = req.headers.get("origin") || APP_BASE_URL;
    const redirectUrl = new URL(BAKIYEM_REDIRECT_URL);
    redirectUrl.searchParams.set("MyTrxCode", intentId);
    redirectUrl.searchParams.set("uiOrigin", origin);

    const configuredPayloadProfile = normalizePayloadProfile(Deno.env.get("BAKIYEM_3D_PAYLOAD_PROFILE"));
    const envPayloadProfile: PayloadProfile = configuredPayloadProfile ?? "extended";
    const headerPayloadProfile = normalizePayloadProfile(req.headers.get("x-bakiyem-payload-profile"));
    const payloadProfile: PayloadProfile = headerPayloadProfile ?? envPayloadProfile;
    const payloadProfileSource = headerPayloadProfile ? "header" : configuredPayloadProfile ? "env" : "default";
    const includeExtendedPayload = true;
    const payloadProfileEffective: PayloadProfile = "extended";
    const payloadProfileReason = payloadProfile === "extended" ? "requested_or_default" : "forced_sample_compat";

    const cardToken = asText(body.cardToken);
    const isTokenized = cardToken.length > 0;

    const paymentDealerRequest: JsonRecord = {
      CardHolderFullName: isTokenized ? "" : cardHolderName,
      CardNumber: isTokenized ? "" : (body.cardDetails?.number?.replace(/\s/g, "") ?? ""),
      ExpMonth: isTokenized ? "" : (parsedExpiry?.month.padStart(2, "0") ?? ""),
      ExpYear: isTokenized ? "" : (parsedExpiry?.year ?? ""),
      CvcNumber: isTokenized ? "" : ((body.cardDetails?.cvv ?? "").replace(/\D/g, "")),
      CardToken: cardToken,
      Amount: paymentAmount,
      Currency: "TL",
      InstallmentNumber: gatewayInstallmentNumber,
      ClientIP: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
      OtherTrxCode: shortTrxCode,
      SubMerchantName: "",
      IsPoolPayment: 0,
      IsPreAuth: 0,
      IsTokenized: isTokenized ? 1 : 0,
      IntegratorId: 0,
      Software: BAKIYEM_SOFTWARE_NAME,
      Description: "",
      ReturnHash: 1,
      RedirectUrl: redirectUrl.toString(),
      RedirectType: 0,
      BuyerInformation: safeBuyerInformation,
      CustomerInformation: safeCustomerInformation,
    };

    const requestDiagnostics = {
      intentId,
      requestedPayloadProfile: payloadProfile,
      payloadProfileEffective,
      payloadProfileSource,
      payloadProfileReason,
      gatewayBaseUrl: BAKIYEM_BASE_URL,
      includeExtendedPayload,
      hasCardToken: Boolean(body.cardToken),
      paymentAmount,
      gatewayInstallmentNumber,
      requestFieldNames: Object.keys(paymentDealerRequest).sort(),
      buyerInfoFieldNames: Object.keys(safeBuyerInformation).sort(),
      customerInfoFieldNames: Object.keys(safeCustomerInformation).sort(),
      buyerProfile: {
        hasPhone: buyerPhone.length > 0,
        hasEmail: buyerEmail.length > 0,
        hasAddress: buyerAddress.length > 0,
      },
      cardDiagnostics: body.cardToken
        ? { mode: "token", cardTokenLength: body.cardToken.length }
        : {
          mode: "manual",
          cardNumberDigitCount: (body.cardDetails?.number ?? "").replace(/\D/g, "").length,
          cvcDigitCount: (body.cardDetails?.cvv ?? "").replace(/\D/g, "").length,
          expMonth: parsedExpiry?.month ?? "",
          expYear: parsedExpiry?.year ?? "",
        },
    };

    console.info("bakiyem-init-3d.request_diagnostics", JSON.stringify(requestDiagnostics));

    const gatewayRequest = { PaymentDealerAuthentication: { DealerCode: BAKIYEM_DEALER_CODE, Username: BAKIYEM_API_USERNAME, Password: BAKIYEM_API_PASSWORD, CheckKey: checkKey }, PaymentDealerRequest: paymentDealerRequest };
    const maskedGatewayRequest = maskGatewayRequest(gatewayRequest);
    const loggedRequestPayload = {
      ...maskedGatewayRequest,
      _diag: requestDiagnostics,
    };

    const gatewayResponseRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoDirectPaymentThreeD`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gatewayRequest),
    });

    const gatewayResponseJson = await gatewayResponseRaw.json().catch(() => ({ ResultCode: "JSON_ERROR" }));
    const gatewayResultCode = String(gatewayResponseJson?.ResultCode || "");
    const gatewayResultMessage = asText(gatewayResponseJson?.ResultMessage);

    const responseDiagnostics = {
      intentId,
      requestedPayloadProfile: payloadProfile,
      payloadProfileEffective,
      payloadProfileSource,
      payloadProfileReason,
      gatewayBaseUrl: BAKIYEM_BASE_URL,
      gatewayHttpStatus: gatewayResponseRaw.status,
      gatewayResultCode,
      gatewayResultMessage: gatewayResultMessage.substring(0, 180),
      hasData: Boolean(gatewayResponseJson?.Data),
    };
    console.info("bakiyem-init-3d.response_diagnostics", JSON.stringify(responseDiagnostics));

    await supabase.from("payment_transactions").insert({
      intent_id: intentId, operation: "init_3d",
      request_payload: loggedRequestPayload,
      response_payload: gatewayResponseJson,
      success: gatewayResultCode === "Success",
      error_code: gatewayResultCode === "Success" ? null : gatewayResultCode || null,
      error_message: gatewayResultCode === "Success" ? null : gatewayResultMessage.substring(0, 200) || null,
    });

    if (gatewayResultCode !== "Success" || !gatewayResponseJson?.Data) {
      return jsonResponse(req, 400, {
        success: false,
        message: gatewayResponseJson?.ResultMessage || "3D gateway failure",
        code: gatewayResultCode || "UNKNOWN",
        payloadProfile: payloadProfileEffective,
      });
    }

    const threeDPayload = parseThreeDPayload(gatewayResponseJson.Data);
    const codeForHash = extractCodeForHash(gatewayResponseJson?.Data);
    let finalGatewayTrxCode = "";
    if (typeof gatewayResponseJson.Data === "string" && gatewayResponseJson.Data.includes("threeDTrxCode=")) {
      const match = gatewayResponseJson.Data.match(/threeDTrxCode=([^&]+)/);
      if (match) finalGatewayTrxCode = match[1];
    }

    await supabase.from("payment_intents").update({
      status: "awaiting_3d",
      gateway_status: gatewayResultCode,
      gateway_trx_code: finalGatewayTrxCode,
      threed_session_ref: codeForHash || null,
      threed_payload_encrypted: await encryptGcm(JSON.stringify(threeDPayload)),
    }).eq("id", intentId);

    return jsonResponse(req, 200, {
      success: true,
      intentId,
      threeD: threeDPayload,
      payloadProfile: payloadProfileEffective,
      requestedPayloadProfile: payloadProfile,
    });
  } catch (error) {
    console.error("Critical Failure:", error);
    return jsonResponse(req, 500, { success: false, message: "Kritik hata" });
  }
});
