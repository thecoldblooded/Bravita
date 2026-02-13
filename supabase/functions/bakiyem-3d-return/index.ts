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
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";

function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toCanonicalPayloadString(payload: JsonRecord): string {
  return Object.keys(payload)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${String(payload[key] ?? "")}`)
    .join("&");
}

function parseAmountCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return Math.round(parsed * 100);
  }
  return null;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

async function parseIncomingPayload(req: Request): Promise<JsonRecord> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as JsonRecord;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const payload: JsonRecord = {};
    for (const [key, value] of form.entries()) {
      payload[key] = typeof value === "string" ? value : value.name;
    }
    return payload;
  }

  return {};
}

async function computeCheckKey(): Promise<string> {
  return sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
}

serve(async (req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Server config missing", { status: 500 });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const payload = await parseIncomingPayload(req);
    for (const [key, value] of url.searchParams.entries()) {
      if (payload[key] === undefined) payload[key] = value;
    }

    const callbackTrxCode = asString(payload.trxCode ?? payload.TrxCode);
    const callbackResultCode = asString(payload.resultCode ?? payload.ResultCode);
    let intentId = asString(
      url.searchParams.get("intentId") ??
      payload.intentId ??
      payload.IntentId ??
      payload.OtherTrxCode ??
      payload.otherTrxCode
    );

    if (!intentId && callbackTrxCode) {
      const { data: trxIntent } = await supabase
        .from("payment_intents")
        .select("id")
        .eq("gateway_trx_code", callbackTrxCode)
        .limit(1)
        .maybeSingle();
      intentId = trxIntent?.id ?? "";
    }

    if (!intentId) {
      return new Response("intentId missing", { status: 400 });
    }

    const otherTrxCode = asString(payload.OtherTrxCode ?? payload.otherTrxCode ?? intentId);
    const payloadHash = await sha256Hex(toCanonicalPayloadString(payload));
    const eventDedupeKey = await sha256Hex(
      `bakiyem:${callbackTrxCode || otherTrxCode}:${callbackResultCode}:${payloadHash}`
    );

    const webhookInsert = await supabase.from("payment_webhook_events").insert({
      provider: "bakiyem",
      intent_id: intentId,
      gateway_trx_code: callbackTrxCode || null,
      other_trx_code: otherTrxCode || null,
      result_code: callbackResultCode || null,
      payload_hash: payloadHash,
      event_dedupe_key: eventDedupeKey,
      payload,
      processing_status: "received",
    });

    if (webhookInsert.error && webhookInsert.error.code === "23505") {
      await supabase
        .from("payment_webhook_events")
        .update({
          processing_status: "ignored",
          error_message: "duplicate_callback",
          processed_at: new Date().toISOString(),
        })
        .eq("event_dedupe_key", eventDedupeKey)
        .in("processing_status", ["received", "failed", "ignored"]);
      return new Response("ok", { status: 200 });
    }

    if (webhookInsert.error) {
      console.error("webhook insert error", webhookInsert.error);
      return new Response("webhook insert failed", { status: 500 });
    }

    const { data: intent, error: intentError } = await supabase
      .from("payment_intents")
      .select("id, paid_total_cents, status, gateway_trx_code")
      .eq("id", intentId)
      .single();

    if (intentError || !intent) {
      await supabase
        .from("payment_webhook_events")
        .update({ processing_status: "failed", error_message: "intent_not_found", processed_at: new Date().toISOString() })
        .eq("event_dedupe_key", eventDedupeKey);
      return new Response("intent not found", { status: 404 });
    }

    const rawIsSuccessful = payload.isSuccessful ?? payload.IsSuccessful;
    const callbackIsSuccessful = rawIsSuccessful === true || asString(rawIsSuccessful).toLowerCase() === "true";
    const resultCodeSuccessful = callbackResultCode.toLowerCase() === "success" || callbackResultCode === "00";
    const callbackSuccess = callbackIsSuccessful || resultCodeSuccessful;

    if (!callbackSuccess) {
      await supabase.rpc("release_intent_reservations_v1", {
        p_intent_id: intentId,
        p_new_status: "failed",
      });

      await supabase
        .from("payment_intents")
        .update({
          status: "failed",
          gateway_status: callbackResultCode || "callback_failed",
          gateway_trx_code: callbackTrxCode || intent.gateway_trx_code,
        })
        .eq("id", intentId);

      await supabase.from("payment_transactions").insert({
        intent_id: intentId,
        operation: "finalize",
        request_payload: payload,
        response_payload: { resultCode: callbackResultCode, isSuccessful: false },
        success: false,
        error_code: callbackResultCode || "callback_failed",
        error_message: asString(payload.resultMessage ?? payload.ResultMessage ?? "3D callback failed"),
      });

      await supabase
        .from("payment_webhook_events")
        .update({ processing_status: "processed", processed_at: new Date().toISOString() })
        .eq("event_dedupe_key", eventDedupeKey);

      return redirectResponse(`${APP_BASE_URL}/payment-failed?intent=${encodeURIComponent(intentId)}&code=${encodeURIComponent(callbackResultCode || "failed")}`);
    }

    const checkKey = await computeCheckKey();
    const inquiryRequest = {
      PaymentDealerAuthentication: {
        DealerCode: BAKIYEM_DEALER_CODE,
        Username: BAKIYEM_API_USERNAME,
        Password: BAKIYEM_API_PASSWORD,
        CheckKey: checkKey,
      },
      PaymentDealerRequest: {
        DealerPaymentId: "",
        OtherTrxCode: intentId,
      },
    };

    const inquiryRaw = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/GetDealerPaymentTrxDetailList`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inquiryRequest),
    });
    const inquiryJson = await inquiryRaw.json().catch(() => ({}));

    const inquiryAmountCents = parseAmountCents(
      (inquiryJson as JsonRecord)?.Data &&
      typeof (inquiryJson as JsonRecord).Data === "object"
        ? ((inquiryJson as JsonRecord).Data as JsonRecord)?.PaymentDetail &&
          typeof ((inquiryJson as JsonRecord).Data as JsonRecord).PaymentDetail === "object"
          ? (((((inquiryJson as JsonRecord).Data as JsonRecord).PaymentDetail as JsonRecord).Amount) ?? null)
          : (((inquiryJson as JsonRecord).Data as JsonRecord).Amount ?? null)
        : null
    );

    if (!inquiryRaw.ok || inquiryJson?.ResultCode !== "Success" || inquiryAmountCents === null) {
      await supabase
        .from("payment_manual_review_queue")
        .insert({
          intent_id: intentId,
          reason: "detail_query_error",
          details: { callback: payload, inquiry: inquiryJson },
          dedupe_key: await sha256Hex(`detail_query_error:${intentId}:${payloadHash}`),
        });

      await supabase
        .from("payment_webhook_events")
        .update({ processing_status: "failed", error_message: "detail_query_error", processed_at: new Date().toISOString() })
        .eq("event_dedupe_key", eventDedupeKey);

      return redirectResponse(`${APP_BASE_URL}/payment-failed?intent=${encodeURIComponent(intentId)}&code=detail_query_error`);
    }

    if (Number(intent.paid_total_cents) !== inquiryAmountCents) {
      await supabase
        .from("payment_manual_review_queue")
        .insert({
          intent_id: intentId,
          reason: "amount_mismatch",
          details: {
            expected_paid_total_cents: intent.paid_total_cents,
            inquiry_amount_cents: inquiryAmountCents,
            callback: payload,
            inquiry: inquiryJson,
          },
          dedupe_key: await sha256Hex(`amount_mismatch:${intentId}:${intent.paid_total_cents}:${inquiryAmountCents}`),
        });

      await supabase.rpc("release_intent_reservations_v1", {
        p_intent_id: intentId,
        p_new_status: "failed",
      });

      await supabase
        .from("payment_webhook_events")
        .update({ processing_status: "failed", error_message: "amount_mismatch", processed_at: new Date().toISOString() })
        .eq("event_dedupe_key", eventDedupeKey);

      return redirectResponse(`${APP_BASE_URL}/payment-failed?intent=${encodeURIComponent(intentId)}&code=amount_mismatch`);
    }

    const finalizePayload = {
      gateway_status: callbackResultCode || "Success",
      trxCode: callbackTrxCode,
      callback_payload_hash: payloadHash,
    };

    const finalizeResult = await supabase.rpc("finalize_intent_create_order_v1", {
      p_intent_id: intentId,
      p_gateway_result: finalizePayload,
    });

    if (finalizeResult.error || !finalizeResult.data?.success || !finalizeResult.data?.order_id) {
      await supabase
        .from("payment_manual_review_queue")
        .insert({
          intent_id: intentId,
          reason: "missing_finalize",
          details: {
            callback: payload,
            inquiry: inquiryJson,
            finalize_error: finalizeResult.error,
            finalize_data: finalizeResult.data,
          },
          dedupe_key: await sha256Hex(`missing_finalize:${intentId}:${payloadHash}`),
        });

      await supabase
        .from("payment_webhook_events")
        .update({ processing_status: "failed", error_message: "missing_finalize", processed_at: new Date().toISOString() })
        .eq("event_dedupe_key", eventDedupeKey);

      return redirectResponse(`${APP_BASE_URL}/payment-failed?intent=${encodeURIComponent(intentId)}&code=missing_finalize`);
    }

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      order_id: finalizeResult.data.order_id,
      operation: "finalize",
      request_payload: payload,
      response_payload: { inquiry: inquiryJson, finalize: finalizeResult.data },
      success: true,
      error_code: null,
      error_message: null,
    });

    await supabase.functions
      .invoke("send-order-email", {
        body: { order_id: finalizeResult.data.order_id },
      })
      .catch(() => undefined);

    await supabase
      .from("payment_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("event_dedupe_key", eventDedupeKey);

    return redirectResponse(`${APP_BASE_URL}/order-confirmation/${encodeURIComponent(finalizeResult.data.order_id)}`);
  } catch (error) {
    console.error("bakiyem-3d-return failed", error);
    return new Response("callback processing failed", { status: 500 });
  }
});
