// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.refmokaunited.com";
const BAKIYEM_DEALER_CODE = Deno.env.get("BAKIYEM_DEALER_CODE") ?? "";
const BAKIYEM_API_USERNAME = Deno.env.get("BAKIYEM_API_USERNAME") ?? "";
const BAKIYEM_API_PASSWORD = Deno.env.get("BAKIYEM_API_PASSWORD") ?? "";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://bravita.com.tr",
  "https://bravita.vercel.app",
  "https://www.bravita.com.tr",
  "http://localhost:8080"
];
const ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter((value) => value.length > 0);
const ACTIVE_ALLOWED_ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
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
  const allowed = isAllowedOrigin(origin) ? origin : ACTIVE_ALLOWED_ORIGINS[0] ?? "*";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}
function response(req, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(req)
  });
}
async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders(req)
  });
  if (req.method !== "POST") return response(req, 405, {
    success: false,
    message: "Method not allowed"
  });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return response(req, 500, {
    success: false,
    message: "Server config missing"
  });
  try {
    const xUserJwt = req.headers.get("x-user-jwt");
    const authHeader = req.headers.get("Authorization");
    const token = (xUserJwt ?? authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return response(req, 401, {
      success: false,
      message: "Unauthorized"
    });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return response(req, 401, {
      success: false,
      message: "Unauthorized"
    });
    const body = await req.json();
    if (!body.cardHolderFullName || !body.cardNumber || !body.expMonth || !body.expYear || !body.cvcNumber) {
      return response(req, 400, {
        success: false,
        message: "Eksik kart veya musteri bilgisi"
      });
    }
    const customerCode = String(body.customerCode ?? "").trim() || `brv-${authData.user.id}`;
    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const authPayload = {
      DealerCustomerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey
      }
    };
    const customerRequest = {
      CustomerCode: customerCode,
      CardHolderFullName: body.cardHolderFullName,
      CardNumber: body.cardNumber.replace(/\D/g, ""),
      ExpMonth: body.expMonth,
      ExpYear: body.expYear,
      CvcNumber: body.cvcNumber
    };
    const addCardRequest = {
      ...authPayload,
      DealerCustomerRequest: {
        ...customerRequest
      }
    };
    const addCardRaw = await fetch(`${BAKIYEM_BASE_URL}/DealerCustomer/AddCard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(addCardRequest)
    });
    const addCardJson = await addCardRaw.json().catch(() => ({}));
    const addCardToken = addCardJson?.Data?.CardToken ?? null;
    if (addCardRaw.ok && addCardJson?.ResultCode === "Success" && addCardToken) {
      return response(req, 200, {
        success: true,
        cardToken: addCardToken
      });
    }
    const addCustomerRequest = {
      ...authPayload,
      DealerCustomerRequest: {
        ...customerRequest,
        CustomerEmail: authData.user.email ?? ""
      }
    };
    const addCustomerRaw = await fetch(`${BAKIYEM_BASE_URL}/DealerCustomer/AddCustomerWithCard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(addCustomerRequest)
    });
    const addCustomerJson = await addCustomerRaw.json().catch(() => ({}));
    const addCustomerToken = addCustomerJson?.Data?.CardToken ?? null;
    if (addCustomerRaw.ok && addCustomerJson?.ResultCode === "Success" && addCustomerToken) {
      return response(req, 200, {
        success: true,
        cardToken: addCustomerToken
      });
    }
    const addCardCode = String(addCardJson?.ResultCode ?? "").trim();
    const addCardMessage = String(addCardJson?.ResultMessage ?? "").trim();
    const addCustomerCode = String(addCustomerJson?.ResultCode ?? "").trim();
    const addCustomerMessage = String(addCustomerJson?.ResultMessage ?? "").trim();
    const fallbackCode = addCustomerCode || addCardCode;
    const fallbackMessage = fallbackCode ? `Card token olusturulamadi (${fallbackCode})` : "Card token olusturulamadi";
    return response(req, 400, {
      success: false,
      code: fallbackCode || undefined,
      message: addCustomerMessage || addCardMessage || fallbackMessage
    });
  } catch (error) {
    console.error("bakiyem-tokenize-card failed", error);
    return response(req, 500, {
      success: false,
      message: "Tokenizasyon islemi basarisiz"
    });
  }
});
