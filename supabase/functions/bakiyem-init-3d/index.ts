// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function normalizePayloadProfile(value) {
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
const THREED_PAYLOAD_ENC_KEY = (Deno.env.get("THREED_PAYLOAD_ENC_KEY") ?? "").trim();
const DEFAULT_ALLOWED_ORIGINS = [
  "https://bravita.com.tr",
  "https://bravita.vercel.app",
  "https://www.bravita.com.tr",
  "http://localhost:8080"
];
const PAYMENT_ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter((value) => value.length > 0);
// Keep defaults active even when PAYMENT_ALLOWED_ORIGINS is set, to prevent accidental
// production lockout for known first-party domains (e.g. bravita.vercel.app).
const ACTIVE_ALLOWED_ORIGINS = Array.from(new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...PAYMENT_ALLOWED_ORIGINS
]));
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ACTIVE_ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}
function corsHeaders(req) {
  const origin = req.headers.get("Origin") ?? "";
  const originAllowed = isAllowedOrigin(origin);
  const allowedOrigin = originAllowed ? origin : ACTIVE_ALLOWED_ORIGINS[0] ?? APP_BASE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json"
  };
}
function jsonResponse(req, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(req)
  });
}
function normalizeItems(items) {
  return items.map((item) => ({
    product_id: String(item.product_id ?? item.id ?? "").trim(),
    quantity: Number(item.quantity)
  })).filter((item) => item.product_id.length > 0 && item.quantity > 0).sort((a, b) => a.product_id.localeCompare(b.product_id));
}
function parseExpiry(expiry) {
  const cleaned = expiry.replace(/\s/g, "");
  const match = /^(\d{2})\/(\d{2,4})$/.exec(cleaned);
  if (!match) return null;
  const month = match[1];
  let year = match[2];
  if (year.length === 2) year = `20${year}`;
  if (Number(month) < 1 || Number(month) > 12) return null;
  return {
    month,
    year
  };
}
async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function amountFromCents(cents) {
  return Number((cents / 100).toFixed(2));
}
function asText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
function normalizePhone10(value) {
  const digits = asText(value).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("90")) return digits.slice(2);
  return "";
}
function splitNameParts(value) {
  const normalized = sanitizeString(asText(value));
  if (!normalized) return {
    firstName: "",
    lastName: ""
  };
  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = (parts[0] ?? "").substring(0, 50);
  const lastName = parts.slice(1).join(" ").substring(0, 50);
  return {
    firstName,
    lastName
  };
}
function normalizeGatewayInstallmentNumber(value) {
  const raw = Number(value);
  // Moka docs mention 0/1 as "single shot", but field evidence in this project shows
  // bank/acquirer failures are clustered when 0 is sent. Use 1 as safe single-shot value.
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  const normalized = Math.trunc(raw);
  return Math.min(12, Math.max(2, normalized));
}
function extractCodeForHash(data) {
  if (data && typeof data === "object") {
    const direct = asText(data?.CodeForHash ?? data?.codeForHash);
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
function clearTurkishChars(str) {
  const map = {
    'ç': 'c',
    'Ç': 'C',
    'ğ': 'g',
    'Ğ': 'G',
    'ı': 'i',
    'I': 'I',
    'İ': 'I',
    'ö': 'o',
    'Ö': 'O',
    'ş': 's',
    'Ş': 'S',
    'ü': 'u',
    'Ü': 'U'
  };
  return str.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (m) => map[m] || m);
}
function sanitizeString(str) {
  return clearTurkishChars(str).replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function maskGatewayRequest(payload) {
  const masked = JSON.parse(JSON.stringify(payload));
  if (masked.PaymentDealerRequest) {
    if (masked.PaymentDealerRequest.CardNumber) masked.PaymentDealerRequest.CardNumber = "****MASKED****";
    if (masked.PaymentDealerRequest.CvcNumber) masked.PaymentDealerRequest.CvcNumber = "***";
    if (masked.PaymentDealerRequest.CardHolderFullName) masked.PaymentDealerRequest.CardHolderFullName = "***MASKED***";
  }
  return masked;
}
function parseThreeDPayload(data) {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("<")) return {
      redirectUrl: null,
      formAction: null,
      formFields: null,
      html: trimmed,
      raw: data
    };
    return {
      redirectUrl: trimmed,
      formAction: null,
      formFields: null,
      html: null,
      raw: data
    };
  }
  return {
    redirectUrl: data?.Url || data?.RedirectUrl || null,
    formAction: data?.FormAction || null,
    formFields: data?.FormFields || null,
    html: data?.Html || null,
    raw: data
  };
}
function base64ToBytes(base64Value) {
  const normalized = base64Value.replace(/^base64:/i, "").replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function bytesToBase64(value) {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
function parseAesKey(value) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Missing THREED_PAYLOAD_ENC_KEY");
  }
  const hexCandidate = normalized.replace(/^hex:/i, "");
  if (/^[0-9a-fA-F]+$/.test(hexCandidate) && [
    32,
    48,
    64
  ].includes(hexCandidate.length)) {
    const out = new Uint8Array(hexCandidate.length / 2);
    for (let i = 0; i < hexCandidate.length; i += 2) {
      out[i / 2] = parseInt(hexCandidate.slice(i, i + 2), 16);
    }
    return out;
  }
  const decoded = base64ToBytes(normalized);
  if (![
    16,
    24,
    32
  ].includes(decoded.byteLength)) {
    throw new Error("THREED_PAYLOAD_ENC_KEY must be 16/24/32 bytes (AES key)");
  }
  return decoded;
}
async function encryptGcm(plaintext) {
  const rawKey = parseAesKey(THREED_PAYLOAD_ENC_KEY);
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "encrypt"
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, key, payload);
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}
function extractUserJwt(req) {
  const xUserJwt = req.headers.get("x-user-jwt");
  const authHeader = req.headers.get("Authorization");
  return (xUserJwt ?? authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders(req)
  });
  if (req.method !== "POST") return jsonResponse(req, 405, {
    success: false,
    message: "Method not allowed"
  });
  try {
    const xUserJwtHeader = req.headers.get("x-user-jwt") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = extractUserJwt(req);
    if (!token) return jsonResponse(req, 401, {
      success: false,
      message: "Unauthorized"
    });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(req, 401, {
        success: false,
        message: "Unauthorized"
      });
    }
    const userId = authData.user.id;
    const body = await req.json();
    // CARD VALIDATION
    if (!body.cardToken && (!body.cardDetails || !body.cardDetails.number || !body.cardDetails.expiry || !body.cardDetails.cvv)) {
      return jsonResponse(req, 400, {
        success: false,
        message: "Kart bilgileri eksik"
      });
    }
    const parsedExpiry = body.cardToken ? null : parseExpiry(body.cardDetails?.expiry ?? "");
    if (!body.cardToken && !parsedExpiry) {
      return jsonResponse(req, 400, {
        success: false,
        message: "Gecersiz son kullanma tarihi (AA/YY veya AA/YYYY olmali)"
      });
    }
    const normalizedItems = normalizeItems(body.items ?? []);
    const { data: quoteData, error: quoteError } = await supabase.rpc("calculate_order_quote_v1", {
      p_user_id: userId,
      p_items: normalizedItems,
      p_shipping_address_id: body.shippingAddressId,
      p_payment_method: "credit_card",
      p_installment_number: body.installmentNumber || 1,
      p_promo_code: body.promoCode ?? null
    });
    if (quoteError || !quoteData?.success) {
      const quoteFailureCode = typeof quoteData?.error === "string" && quoteData.error.trim().length > 0
        ? quoteData.error.trim()
        : "QUOTE_FAILURE";

      return jsonResponse(req, 400, {
        success: false,
        message: quoteData?.message || quoteError?.message || "Quote failure",
        code: quoteFailureCode,
        error: quoteFailureCode,
      });
    }
    const paymentTotalCents = Number(quoteData.paid_total_cents);
    if (!Number.isFinite(paymentTotalCents) || paymentTotalCents <= 0) {
      return jsonResponse(req, 400, {
        success: false,
        message: "Gecersiz odeme tutari"
      });
    }
    const cartHash = await sha256Hex(JSON.stringify(normalizedItems));
    const idempotencyKey = await sha256Hex(`${userId}:${cartHash}:${Date.now()}`);
    const pricingSnapshot = {
      ...quoteData,
      shipping_address_id: body.shippingAddressId,
      calculated_at: new Date().toISOString()
    };
    const { data: intent, error: insertError } = await supabase.from("payment_intents").insert({
      user_id: userId,
      shipping_address_id: body.shippingAddressId,
      status: "pending",
      idempotency_key: idempotencyKey,
      idempotency_expires_at: new Date(Date.now() + 600000).toISOString(),
      currency: "TL",
      item_total_cents: quoteData.item_total_cents,
      vat_total_cents: quoteData.vat_total_cents,
      shipping_total_cents: quoteData.shipping_total_cents,
      discount_total_cents: quoteData.discount_total_cents,
      base_total_cents: quoteData.base_total_cents,
      commission_amount_cents: quoteData.commission_amount_cents,
      paid_total_cents: paymentTotalCents,
      installment_number: quoteData.installment_number,
      cart_snapshot: quoteData.cart_snapshot,
      pricing_snapshot: pricingSnapshot,
      provider: "bakiyem",
      return_url: BAKIYEM_REDIRECT_URL,
      fail_url: BAKIYEM_REDIRECT_URL
    }).select("id").single();
    if (insertError) return jsonResponse(req, 500, {
      success: false,
      message: insertError.message
    });
    const intentId = intent.id;

    const { error: reservationError } = await supabase.rpc("reserve_stock_for_intent_v1", {
      p_intent_id: intentId,
      p_ttl_minutes: 15,
    });

    if (reservationError) {
      await supabase.from("payment_transactions").insert({
        intent_id: intentId,
        operation: "reserve_stock",
        success: false,
        error_message: reservationError.message,
      });

      await supabase
        .from("payment_intents")
        .update({
          status: "failed",
          gateway_status: `reserve_failed:${reservationError.message.substring(0, 80)}`,
        })
        .eq("id", intentId)
        .in("status", ["pending", "awaiting_3d"]);

      return jsonResponse(req, 400, {
        success: false,
        message: "Stok rezerve edilemedi",
        code: "RESERVATION_FAILED",
      });
    }

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "reserve_stock",
      success: true,
      request_payload: { p_ttl_minutes: 15 },
    });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const { data: addr } = await supabase.from("addresses").select("*").eq("id", body.shippingAddressId).single();
    const cardHolderName = asText(body.cardDetails?.name || profile?.full_name || "Bravita Customer").substring(0, 100).trim();
    const buyerName = (asText(profile?.full_name || cardHolderName).substring(0, 100) || "Bravita Customer").trim();
    const buyerPhone = normalizePhone10(profile?.phone);
    const buyerEmail = asText(profile?.email || authData.user?.email || "");
    const buyerAddress = sanitizeString([
      asText(addr?.address || addr?.address_line1),
      asText(addr?.address_line2),
      asText(addr?.district),
      asText(addr?.city)
    ].filter((part) => part.length > 0).join(" ")).substring(0, 200);
    const { firstName: customerFirstName, lastName: customerLastName } = splitNameParts(buyerName);
    const customerCode = userId.replace(/-/g, "").substring(0, 32);
    const safeBuyerInformation = {
      BuyerFullName: buyerName,
      BuyerGsmNumber: buyerPhone,
      BuyerEmail: buyerEmail,
      BuyerAddress: buyerAddress
    };
    const safeCustomerInformation = {
      DealerCustomerId: "",
      CustomerCode: customerCode,
      FirstName: customerFirstName || "",
      LastName: customerLastName || "",
      Gender: "1",
      BirthDate: "",
      GsmNumber: buyerPhone,
      Email: buyerEmail,
      Address: buyerAddress,
      CardName: body.cardToken ? "Tokenized Card" : "Maximum kartim"
    };
    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const shortTrxCode = intentId.replace(/-/g, "").substring(0, 20);
    const paymentAmount = amountFromCents(paymentTotalCents);
    const gatewayInstallmentNumber = normalizeGatewayInstallmentNumber(quoteData.installment_number ?? body.installmentNumber ?? 1);
    const requestOrigin = req.headers.get("origin") ?? "";
    const isRequestOriginAllowed = isAllowedOrigin(requestOrigin);
    const uiOrigin = isRequestOriginAllowed ? requestOrigin : APP_BASE_URL;
    const hasVercelOriginInAllowlist = ACTIVE_ALLOWED_ORIGINS.includes("https://bravita.vercel.app");

    console.info("bakiyem-init-3d ui-origin resolution", {
      intentId,
      requestOrigin,
      isRequestOriginAllowed,
      resolvedUiOrigin: uiOrigin,
      appBaseUrl: APP_BASE_URL,
      hasVercelOriginInAllowlist,
      activeAllowedOriginsSample: ACTIVE_ALLOWED_ORIGINS.slice(0, 8),
      activeAllowedOriginsCount: ACTIVE_ALLOWED_ORIGINS.length,
    });

    const redirectUrl = new URL(BAKIYEM_REDIRECT_URL);
    redirectUrl.searchParams.set("MyTrxCode", intentId);
    redirectUrl.searchParams.set("uiOrigin", uiOrigin);
    const configuredPayloadProfile = normalizePayloadProfile(Deno.env.get("BAKIYEM_3D_PAYLOAD_PROFILE"));
    const envPayloadProfile = configuredPayloadProfile ?? "extended";
    const headerPayloadProfile = normalizePayloadProfile(req.headers.get("x-bakiyem-payload-profile"));
    const payloadProfile = headerPayloadProfile ?? envPayloadProfile;
    const payloadProfileSource = headerPayloadProfile ? "header" : configuredPayloadProfile ? "env" : "default";
    const includeExtendedPayload = true;
    const payloadProfileEffective = "extended";
    const payloadProfileReason = payloadProfile === "extended" ? "requested_or_default" : "forced_sample_compat";
    const cardToken = asText(body.cardToken);
    const isTokenized = cardToken.length > 0;
    const paymentDealerRequest = {
      CardHolderFullName: isTokenized ? "" : cardHolderName,
      CardNumber: isTokenized ? "" : body.cardDetails?.number?.replace(/\D/g, "") ?? "",
      ExpMonth: isTokenized ? "" : parsedExpiry?.month.padStart(2, "0") ?? "",
      ExpYear: isTokenized ? "" : parsedExpiry?.year ?? "",
      CvcNumber: isTokenized ? "" : (body.cardDetails?.cvv ?? "").replace(/\D/g, ""),
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
      CustomerInformation: safeCustomerInformation
    };
    const requestDiagnostics = {
      intentId,
      requestOrigin,
      isRequestOriginAllowed,
      resolvedUiOrigin: uiOrigin,
      appBaseUrl: APP_BASE_URL,
      hasVercelOriginInAllowlist,
      activeAllowedOriginsSample: ACTIVE_ALLOWED_ORIGINS.slice(0, 8),
      activeAllowedOriginsCount: ACTIVE_ALLOWED_ORIGINS.length,
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
        hasAddress: buyerAddress.length > 0
      },
      cardDiagnostics: body.cardToken ? {
        mode: "token",
        cardTokenLength: body.cardToken.length
      } : {
        mode: "manual",
        cardNumberDigitCount: (body.cardDetails?.number ?? "").replace(/\D/g, "").length,
        cvcDigitCount: (body.cardDetails?.cvv ?? "").replace(/\D/g, "").length,
        expMonth: parsedExpiry?.month ?? "",
        expYear: parsedExpiry?.year ?? ""
      }
    };
    const gatewayRequest = {
      PaymentDealerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey
      },
      PaymentDealerRequest: paymentDealerRequest
    };
    const maskedGatewayRequest = maskGatewayRequest(gatewayRequest);
    const loggedRequestPayload = {
      ...maskedGatewayRequest,
      _diag: requestDiagnostics
    };
    const gatewayResponseRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoDirectPaymentThreeD`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(gatewayRequest)
    });
    const gatewayResponseJson = await gatewayResponseRaw.json().catch(() => ({
      ResultCode: "JSON_ERROR"
    }));
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
      hasData: Boolean(gatewayResponseJson?.Data)
    };
    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "init_3d",
      request_payload: loggedRequestPayload,
      response_payload: gatewayResponseJson,
      success: gatewayResultCode === "Success",
      error_code: gatewayResultCode === "Success" ? null : gatewayResultCode || null,
      error_message: gatewayResultCode === "Success" ? null : gatewayResultMessage.substring(0, 200) || null
    });
    if (gatewayResultCode !== "Success" || !gatewayResponseJson?.Data) {
      let errorMessage = gatewayResponseJson?.ResultMessage;
      if (!errorMessage) {
        if (gatewayResultCode === "PaymentDealer.Fraud.BuyerBlocked") {
          errorMessage = "Güvenlik nedeniyle ödeme sistemi tarafından engellendi. Farklı bir kart, telefon numarası veya e-posta deneyin (Test ortamında sık denemelerde olur).";
        } else if (gatewayResultCode === "PaymentDealer.CheckKey.Invalid") {
          errorMessage = "Banka/Ödeme kuruluşu entegrasyon hatası (Geçersiz CheckKey/Şifre).";
        } else if (gatewayResultCode === "PaymentDealer.CheckCardInfo.InvalidCardInfo") {
          errorMessage = "Kart bilgileri doğrulanamadı. Kart numarası / son kullanma tarihi / CVV değerlerini kontrol edin.";
        } else {
          errorMessage = "3D gateway failure";
        }
      }

      await supabase.from("payment_intents").update({
        status: "failed",
        gateway_status: `init_failed:${gatewayResultCode || "UNKNOWN"}`
      }).eq("id", intentId).in("status", ["pending", "awaiting_3d"]);

      return jsonResponse(req, 400, {
        success: false,
        message: errorMessage,
        code: gatewayResultCode || "UNKNOWN",
        payloadProfile: payloadProfileEffective
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
      threed_payload_encrypted: await encryptGcm(JSON.stringify(threeDPayload))
    }).eq("id", intentId);
    return jsonResponse(req, 200, {
      success: true,
      intentId,
      threeD: threeDPayload,
      payloadProfile: payloadProfileEffective,
      requestedPayloadProfile: payloadProfile
    });
  } catch (error) {
    console.error("Critical Failure:", error);
    return jsonResponse(req, 500, {
      success: false,
      message: "Kritik hata"
    });
  }
});
