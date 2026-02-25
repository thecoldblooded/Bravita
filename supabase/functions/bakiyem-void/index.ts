// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

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
  "http://localhost:8080",
];

const ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const ACTIVE_ALLOWED_ORIGINS = Array.from(new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...ALLOWED_ORIGINS,
]));

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

    const body = (await req.json()) as { orderId?: string; reason?: string };
    if (!body.orderId) return response(req, 400, { success: false, message: "orderId zorunlu" });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_intent_id, payment_status")
      .eq("id", body.orderId)
      .single();

    if (orderError || !order?.payment_intent_id) {
      return response(req, 404, { success: false, message: "Order veya payment intent bulunamadi" });
    }

    const { data: intent, error: intentError } = await supabase
      .from("payment_intents")
      .select("id, gateway_trx_code, status")
      .eq("id", order.payment_intent_id)
      .single();

    if (intentError || !intent) {
      return response(req, 404, { success: false, message: "Payment intent bulunamadi" });
    }

    if (!intent.gateway_trx_code) {
      return response(req, 400, { success: false, message: "Gateway trx code bulunamadi" });
    }

    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const voidRequest = {
      PaymentDealerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey,
      },
      PaymentDealerRequest: {
        VirtualPosOrderId: intent.gateway_trx_code,
        VoidRefundReason: 2,
        ClientIP: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
      },
    };

    const voidRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/DoVoid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voidRequest),
    });
    const voidJson = await voidRaw.json().catch(() => ({}));

    const isSuccess = voidRaw.ok &&
      (voidJson?.ResultCode === "Success") &&
      ((voidJson?.Data?.IsSuccessful === true) || (voidJson?.Data?.ResultCode === "00"));

    await supabase.from("payment_transactions").insert({
      intent_id: intent.id,
      order_id: order.id,
      operation: "void",
      request_payload: {
        PaymentDealerAuthentication: { DealerCode: "masked", Username: "masked", Password: "masked", CheckKey: "masked" },
        PaymentDealerRequest: voidRequest.PaymentDealerRequest,
      },
      response_payload: voidJson,
      success: isSuccess,
      error_code: voidJson?.ResultCode ?? null,
      error_message: voidJson?.ResultMessage ?? null,
    });

    if (isSuccess) {
      await supabase
        .from("payment_intents")
        .update({ status: "voided", gateway_status: "voided" })
        .eq("id", intent.id);

      await supabase
        .from("orders")
        .update({ payment_status: "refunded" })
        .eq("id", order.id);

      return response(req, 200, { success: true, pending: false, message: "Void basarili" });
    }

    await supabase
      .from("payment_intents")
      .update({ status: "void_pending", gateway_status: "void_pending" })
      .eq("id", intent.id);

    await supabase
      .from("payment_manual_review_queue")
      .upsert(
        {
          intent_id: intent.id,
          order_id: order.id,
          reason: "stuck_void_pending",
          details: { request: voidRequest.PaymentDealerRequest, response: voidJson },
          dedupe_key: `void_pending:${intent.id}`,
        },
        {
          onConflict: "dedupe_key",
          ignoreDuplicates: true,
        },
      );

    return response(req, 202, { success: false, pending: true, message: "Void pending, manuel inceleme kuyruğuna alindi" });
  } catch (error) {
    console.error("bakiyem-void failed", error);
    return response(req, 500, { success: false, message: "Void istegi islenemedi" });
  }
});
