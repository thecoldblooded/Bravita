// @ts-nocheck
/// <reference path="../send-test-email/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
interface JsonArray extends Array<JsonValue> { }
type JsonRecord = JsonObject;

interface ReconciliationWindow {
  start: Date;
  end: Date;
}

interface PaymentIntent {
  id: string;
  paid_total_cents: number | string;
  currency: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface ProviderWindowResult {
  ok: boolean;
  resultCode: string;
  resultMessage: string;
  records: JsonRecord[];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PAYMENT_MAINTENANCE_SECRET = Deno.env.get("PAYMENT_MAINTENANCE_SECRET") ?? "";

const BAKIYEM_BASE_URL = Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.mokaunited.com";
const BAKIYEM_TEST_BASE_URL = Deno.env.get("BAKIYEM_TEST_BASE_URL") ?? "https://service.refmokaunited.com";
const BAKIYEM_DEALER_CODE = Deno.env.get("BAKIYEM_DEALER_CODE") ?? "";
const BAKIYEM_API_USERNAME = Deno.env.get("BAKIYEM_API_USERNAME") ?? "";
const BAKIYEM_API_PASSWORD = Deno.env.get("BAKIYEM_API_PASSWORD") ?? "";

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const PAYMENT_RECONCILIATION_ENABLED = (Deno.env.get("PAYMENT_RECONCILIATION_ENABLED") ?? "true").toLowerCase() === "true";
const PAYMENT_RECON_LOOKBACK_HOURS = parsePositiveIntegerEnv("PAYMENT_RECON_LOOKBACK_HOURS", 24);
const PAYMENT_RECON_WINDOW_MINUTES = parsePositiveIntegerEnv("PAYMENT_RECON_WINDOW_MINUTES", 30);
const PAYMENT_RECON_MAX_RECORDS = parsePositiveIntegerEnv("PAYMENT_RECON_MAX_RECORDS", 500);

const UUID_V4_OR_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, payload: JsonRecord): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function parseAmountCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return Math.round(parsed * 100);
  }
  return null;
}

function formatProviderDateUtc(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function isUuid(value: string): boolean {
  return UUID_V4_OR_V7_REGEX.test(value);
}

function pickFirstString(record: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value.length > 0) return value;
  }
  return "";
}

function extractRecordArray(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item) => !!asJsonRecord(item)).map((item) => item as JsonRecord);
  }

  const data = asJsonRecord(payload);
  if (!data) return [];

  const candidates = [
    data.PaymentList,
    data.DealerPaymentList,
    data.TrxList,
    data.Items,
    data.List,
    data.Payments,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => !!asJsonRecord(item)).map((item) => item as JsonRecord);
    }
  }

  return [];
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function computeCheckKey(): Promise<string> {
  return sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
}

async function callGetPaymentList(
  baseUrl: string,
  checkKey: string,
  window: ReconciliationWindow,
): Promise<ProviderWindowResult> {
  const requestPayload = {
    PaymentDealerAuthentication: {
      DealerCode: BAKIYEM_DEALER_CODE,
      Username: BAKIYEM_API_USERNAME,
      Password: BAKIYEM_API_PASSWORD,
      CheckKey: checkKey,
    },
    PaymentDealerRequest: {
      PaymentStartDate: formatProviderDateUtc(window.start),
      PaymentEndDate: formatProviderDateUtc(window.end),
      PaymentStatus: "",
      TrxStatus: "",
    },
  };

  const raw = await fetch(`${baseUrl}/PaymentDealer/GetPaymentList`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  });

  const json = (await raw.json().catch(() => ({}))) as JsonRecord;
  return {
    ok: raw.ok && asString(json.ResultCode) === "Success",
    resultCode: asString(json.ResultCode),
    resultMessage: asString(json.ResultMessage),
    records: extractRecordArray(json.Data),
  };
}

async function runProviderHealthChecks(): Promise<JsonRecord> {
  if (!BAKIYEM_DEALER_CODE || !BAKIYEM_API_USERNAME || !BAKIYEM_API_PASSWORD) {
    return {
      success: false,
      message: "Bakiyem credentials missing",
    };
  }

  const checkKey = await computeCheckKey();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const window: ReconciliationWindow = { start: oneDayAgo, end: now };

  const prodResult = await callGetPaymentList(BAKIYEM_BASE_URL, checkKey, window);
  const testResult = await callGetPaymentList(BAKIYEM_TEST_BASE_URL, checkKey, window);
  const prodAuthOk = prodResult.resultCode === "Success" || prodResult.resultCode.endsWith(".NoDataFound");
  const sandboxProvisioned = testResult.resultCode === "Success" || testResult.resultCode.endsWith(".NoDataFound");

  return {
    success: prodAuthOk,
    production: {
      base_url: BAKIYEM_BASE_URL,
      result_code: prodResult.resultCode,
      result_message: prodResult.resultMessage,
      record_count: prodResult.records.length,
      auth_ok: prodAuthOk,
    },
    sandbox: {
      base_url: BAKIYEM_TEST_BASE_URL,
      result_code: testResult.resultCode,
      result_message: testResult.resultMessage,
      record_count: testResult.records.length,
      provision_confirmed: sandboxProvisioned,
      go_live_approved: false,
    },
  };
}

async function runReconciliation(
  supabase: ReturnType<typeof createClient>,
): Promise<JsonRecord> {
  if (!BAKIYEM_DEALER_CODE || !BAKIYEM_API_USERNAME || !BAKIYEM_API_PASSWORD) {
    return {
      success: false,
      message: "Bakiyem credentials missing",
    };
  }

  const checkKey = await computeCheckKey();
  const now = new Date();
  const start = new Date(now.getTime() - PAYMENT_RECON_LOOKBACK_HOURS * 60 * 60 * 1000);

  const baseWindowMs = PAYMENT_RECON_WINDOW_MINUTES * 60 * 1000;
  const queue: ReconciliationWindow[] = [];
  for (let cursor = start.getTime(); cursor < now.getTime(); cursor += baseWindowMs) {
    const windowStart = new Date(cursor);
    const windowEnd = new Date(Math.min(cursor + baseWindowMs, now.getTime()));
    queue.push({ start: windowStart, end: windowEnd });
  }
  const minWindowMs = 60 * 1000;
  const providerRecords: JsonRecord[] = [];
  const fetchErrors: JsonRecord[] = [];
  let requestCount = 0;
  let overflowWindowCount = 0;

  while (queue.length > 0) {
    const current = queue.pop() as ReconciliationWindow;
    requestCount += 1;

    const result = await callGetPaymentList(BAKIYEM_BASE_URL, checkKey, current);
    if (!result.ok && !result.resultCode.endsWith(".NoDataFound")) {
      fetchErrors.push({
        window_start: formatProviderDateUtc(current.start),
        window_end: formatProviderDateUtc(current.end),
        result_code: result.resultCode,
        result_message: result.resultMessage,
      });
      continue;
    }

    const durationMs = current.end.getTime() - current.start.getTime();
    if (result.records.length >= PAYMENT_RECON_MAX_RECORDS && durationMs > minWindowMs) {
      const mid = new Date(current.start.getTime() + Math.floor(durationMs / 2));
      queue.push({ start: mid, end: current.end });
      queue.push({ start: current.start, end: mid });
      continue;
    }

    if (result.records.length >= PAYMENT_RECON_MAX_RECORDS) {
      overflowWindowCount += 1;
      const dedupeKey = await sha256Hex(
        `recon_window_overflow:${formatProviderDateUtc(current.start)}:${formatProviderDateUtc(current.end)}`,
      );
      await supabase.from("payment_manual_review_queue").upsert(
        {
          reason: "reconciliation_window_overflow",
          details: {
            window_start: formatProviderDateUtc(current.start),
            window_end: formatProviderDateUtc(current.end),
            record_count: result.records.length,
          },
          dedupe_key: dedupeKey,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      );
    }

    providerRecords.push(...result.records);
  }

  const uniqueProviderMap = new Map<string, JsonRecord>();
  for (const record of providerRecords) {
    const trxCode = pickFirstString(record, ["TrxCode", "trxCode", "VirtualPosOrderId"]);
    const otherTrxCode = pickFirstString(record, ["OtherTrxCode", "otherTrxCode", "MerchantOrderId", "MerchantRef"]);
    const amountKey = asString(record.Amount ?? record.amount ?? "");
    const key = `${trxCode}:${otherTrxCode}:${amountKey}`;
    if (!uniqueProviderMap.has(key)) uniqueProviderMap.set(key, record);
  }

  const { data: localIntents, error: localError } = await supabase
    .from("payment_intents")
    .select("id, paid_total_cents, currency, status, created_at")
    .eq("status", "paid")
    .gte("created_at", start.toISOString())
    .lte("created_at", now.toISOString());

  if (localError) {
    return {
      success: false,
      message: "Local intents query failed",
      local_error: localError.message,
      request_count: requestCount,
      provider_record_count: uniqueProviderMap.size,
      fetch_error_count: fetchErrors.length,
    };
  }

  const validIntents = (localIntents as unknown as PaymentIntent[]) ?? [];
  const localById = new Map<string, PaymentIntent>(validIntents.map((intent) => [intent.id, intent]));
  const matchedLocalIds = new Set<string>();
  let queueUpserts = 0;

  for (const record of uniqueProviderMap.values()) {
    const otherTrxCode = pickFirstString(record, ["OtherTrxCode", "otherTrxCode", "MerchantOrderId", "MerchantRef"]);
    const trxCode = pickFirstString(record, ["TrxCode", "trxCode", "VirtualPosOrderId"]);
    if (!isUuid(otherTrxCode)) continue;

    const localIntent = localById.get(otherTrxCode);
    if (!localIntent) {
      const dedupeKey = await sha256Hex(`gateway_paid_but_local_missing:${otherTrxCode}:${trxCode}`);
      const result = await supabase.from("payment_manual_review_queue").upsert(
        {
          intent_id: null,
          reason: "gateway_paid_but_local_missing",
          details: {
            other_trx_code: otherTrxCode,
            gateway_trx_code: trxCode,
            record,
          },
          dedupe_key: dedupeKey,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      );
      if (!result.error) queueUpserts += 1;
      continue;
    }

    matchedLocalIds.add(localIntent.id);
    const amountCents = parseAmountCents(record.Amount ?? record.amount ?? null);
    if (amountCents !== null && amountCents !== Number(localIntent.paid_total_cents)) {
      const dedupeKey = await sha256Hex(
        `amount_mismatch:${localIntent.id}:${localIntent.paid_total_cents}:${amountCents}`,
      );
      const result = await supabase.from("payment_manual_review_queue").upsert(
        {
          intent_id: localIntent.id,
          reason: "amount_mismatch",
          details: {
            expected_paid_total_cents: Number(localIntent.paid_total_cents),
            provider_paid_total_cents: amountCents,
            gateway_trx_code: trxCode,
            record,
          },
          dedupe_key: dedupeKey,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      );
      if (!result.error) queueUpserts += 1;
    }
  }

  for (const localIntent of localById.values()) {
    if (matchedLocalIds.has(localIntent.id)) continue;
    const dedupeKey = await sha256Hex(`local_paid_but_gateway_missing:${localIntent.id}`);
    const result = await supabase.from("payment_manual_review_queue").upsert(
      {
        intent_id: localIntent.id,
        reason: "local_paid_but_gateway_missing",
        details: {
          intent_id: localIntent.id,
          created_at: localIntent.created_at,
          paid_total_cents: Number(localIntent.paid_total_cents),
        },
        dedupe_key: dedupeKey,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (!result.error) queueUpserts += 1;
  }

  return {
    success: true,
    lookback_hours: PAYMENT_RECON_LOOKBACK_HOURS,
    base_window_minutes: PAYMENT_RECON_WINDOW_MINUTES,
    max_records_per_window: PAYMENT_RECON_MAX_RECORDS,
    provider_request_count: requestCount,
    provider_record_count: uniqueProviderMap.size,
    fetch_error_count: fetchErrors.length,
    overflow_window_count: overflowWindowCount,
    matched_local_intents: matchedLocalIds.size,
    local_paid_intents: localById.size,
    manual_review_upserts: queueUpserts,
    fetch_errors: fetchErrors,
  };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { success: false, message: "Server config missing" });
  }

  const expectedSecret = PAYMENT_MAINTENANCE_SECRET.trim();
  if (expectedSecret.length === 0) {
    return jsonResponse(500, { success: false, message: "Maintenance secret not configured" });
  }

  const providedSecret = (req.headers.get("x-maintenance-secret") ?? "").trim();
  if (providedSecret !== expectedSecret) {
    return jsonResponse(401, { success: false, message: "Unauthorized" });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      run_provider_checks?: boolean;
      run_reconciliation?: boolean;
    };

    const runProviderChecks = body.run_provider_checks === true;
    const runReconciliationNow =
      typeof body.run_reconciliation === "boolean" ? body.run_reconciliation : PAYMENT_RECONCILIATION_ENABLED;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const releaseResult = await supabase.rpc("release_expired_reservations_v1");
    const expireResult = await supabase.rpc("expire_abandoned_intents_v1");

    const voidThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const refundThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const [stuckVoid, stuckRefund] = await Promise.all([
      supabase
        .from("payment_intents")
        .select("id, status, updated_at")
        .eq("status", "void_pending")
        .lt("updated_at", voidThreshold),
      supabase
        .from("payment_intents")
        .select("id, status, updated_at")
        .eq("status", "refund_pending")
        .lt("updated_at", refundThreshold),
    ]);

    let queuedCount = 0;
    const candidates = [...(stuckVoid.data ?? []) as unknown as PaymentIntent[], ...(stuckRefund.data ?? []) as unknown as PaymentIntent[]];

    for (const intent of candidates) {
      const reason = intent.status === "void_pending" ? "stuck_void_pending" : "stuck_refund_pending";
      const dedupeKey = await sha256Hex(`${reason}:${intent.id}`);

      const upsertResult = await supabase
        .from("payment_manual_review_queue")
        .upsert(
          {
            intent_id: intent.id,
            reason,
            details: {
              status: intent.status,
              last_updated_at: intent.updated_at,
            },
            dedupe_key: dedupeKey,
          },
          {
            onConflict: "dedupe_key",
            ignoreDuplicates: true,
          },
        );

      if (!upsertResult.error) {
        queuedCount += 1;
      }
    }

    const providerChecks = runProviderChecks ? await runProviderHealthChecks() : { skipped: true };
    const reconciliationResult = runReconciliationNow
      ? await runReconciliation(supabase)
      : ({ skipped: true } as JsonRecord);

    return jsonResponse(200, {
      success: true,
      release_result: releaseResult.data ?? null,
      release_error: releaseResult.error ?? null,
      expire_result: expireResult.data ?? null,
      expire_error: expireResult.error ?? null,
      stuck_review_candidates: candidates.length,
      manual_review_upserts: queuedCount,
      provider_checks: providerChecks,
      reconciliation: reconciliationResult,
    });
  } catch (error) {
    console.error("payment-maintenance failed", error);
    return jsonResponse(500, { success: false, message: "Maintenance failed" });
  }
});
