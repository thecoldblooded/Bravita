// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.testmoka.com";
const BAKIYEM_DEALER_CODE = Deno.env.get("BAKIYEM_DEALER_CODE") ?? "";
const BAKIYEM_API_USERNAME = Deno.env.get("BAKIYEM_API_USERNAME") ?? "";
const BAKIYEM_API_PASSWORD = Deno.env.get("BAKIYEM_API_PASSWORD") ?? "";

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
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function response(req: Request, status: number, payload: JsonRecord): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(req),
  });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extractUserJwt(req: Request): string | null {
  const xUserJwt = req.headers.get("x-user-jwt");
  if (xUserJwt && xUserJwt.trim().length > 0) {
    return xUserJwt.replace(/^Bearer\s+/i, "").trim();
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return response(req, 405, { success: false, message: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return response(req, 500, { success: false, message: "Server config missing" });

  try {
    const token = extractUserJwt(req);
    if (!token) return response(req, 401, { success: false, message: "Unauthorized" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return response(req, 401, { success: false, message: "Unauthorized" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_superadmin")
      .eq("id", authData.user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_superadmin) {
      return response(req, 403, { success: false, message: "Admin yetkisi gerekli" });
    }

    const body = (await req.json()) as { intentId?: string; amountCents?: number };
    if (!body.intentId) return response(req, 400, { success: false, message: "intentId zorunlu" });

    const { data: intent, error: intentError } = await supabase
      .from("payment_intents")
      .select("id, gateway_trx_code, paid_total_cents, status")
      .eq("id", body.intentId)
      .single();

    if (intentError || !intent) {
      return response(req, 404, { success: false, message: "Payment intent bulunamadi" });
    }

    if (!intent.gateway_trx_code) {
      return response(req, 400, { success: false, message: "Gateway trx code bulunamadi" });
    }

    const captureAmountCents = Number.isFinite(body.amountCents) && (body.amountCents as number) > 0
      ? Number(body.amountCents)
      : Number(intent.paid_total_cents);

    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const captureRequest = {
      PaymentDealerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey,
      },
      PaymentDealerRequest: {
        VirtualPosOrderId: intent.gateway_trx_code,
        Amount: (captureAmountCents / 100).toFixed(2),
      },
    };

    const captureRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoCapture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(captureRequest),
    });
    const captureJson = await captureRaw.json().catch(() => ({}));

    const isSuccess = captureRaw.ok &&
      (captureJson?.ResultCode === "Success") &&
      ((captureJson?.Data?.IsSuccessful === true) || (captureJson?.Data?.ResultCode === "00"));

    await supabase.from("payment_transactions").insert({
      intent_id: intent.id,
      operation: "capture",
      request_payload: {
        PaymentDealerAuthentication: { DealerCode: "masked", Username: "masked", Password: "masked", CheckKey: "masked" },
        PaymentDealerRequest: captureRequest.PaymentDealerRequest,
      },
      response_payload: captureJson,
      success: isSuccess,
      error_code: captureJson?.ResultCode ?? null,
      error_message: captureJson?.ResultMessage ?? null,
    });

    if (!isSuccess) {
      return response(req, 400, { success: false, message: captureJson?.ResultMessage ?? "Capture basarisiz" });
    }

    return response(req, 200, { success: true, message: "Capture basarili" });
  } catch (error) {
    console.error("bakiyem-capture failed", error);
    return response(req, 500, { success: false, message: "Capture istegi islenemedi" });
  }
});
