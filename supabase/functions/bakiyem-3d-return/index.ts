// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_APP_BASE_URL = "https://bravita.com.tr";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://bravita.com.tr",
  "https://www.bravita.com.tr",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

const PAYMENT_ALLOWED_ORIGINS = (Deno.env.get("PAYMENT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const ACTIVE_ALLOWED_ORIGINS = PAYMENT_ALLOWED_ORIGINS.length > 0
  ? PAYMENT_ALLOWED_ORIGINS
  : DEFAULT_ALLOWED_ORIGINS;

const BAKIYEM_BASE_URL = (Deno.env.get("BAKIYEM_BASE_URL") ?? "https://service.refmokaunited.com").trim();
const BAKIYEM_DEALER_CODE = (Deno.env.get("BAKIYEM_DEALER_CODE") ?? "").trim();
const BAKIYEM_API_USERNAME = (Deno.env.get("BAKIYEM_API_USERNAME") ?? "").trim();
const BAKIYEM_API_PASSWORD = (Deno.env.get("BAKIYEM_API_PASSWORD") ?? "").trim();

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toLowerSafe(value: unknown): string {
  return asText(value).trim().toLowerCase();
}

function normalizeComparable(value: unknown): string {
  return asText(value).replace(/[\s\-_]/g, "").trim().toLowerCase();
}

function isAllowedOrigin(origin: string): boolean {
  return ACTIVE_ALLOWED_ORIGINS.includes(origin);
}

function resolveUiOrigin(value: string | null): string {
  const origin = (value ?? "").trim();
  if (isAllowedOrigin(origin)) return origin;
  return ACTIVE_ALLOWED_ORIGINS[0] ?? DEFAULT_APP_BASE_URL;
}

function pickFirstText(record: Record<string, unknown> | null | undefined, keys: string[]): string {
  const safeRecord = record ?? null;
  if (!safeRecord) return "";
  for (const key of keys) {
    const value = asText(safeRecord[key]);
    if (value.length > 0) return value;
  }
  return "";
}

function isSuccessResultCode(value: unknown): boolean {
  return ["success", "0", "00", "000"].includes(toLowerSafe(value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractProviderRecordList(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload
      .filter((item) => !!asRecord(item))
      .map((item) => item as Record<string, unknown>);
  }

  const root = asRecord(payload);
  if (!root) return [];

  const listCandidates = [
    root.PaymentList,
    root.DealerPaymentList,
    root.TrxList,
    root.PaymentTrxDetailList,
    root.DealerPaymentTrxDetailList,
    root.DealerPaymentTrxDetails,
    root.Items,
    root.List,
    root.Payments,
  ];

  for (const candidate of listCandidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .filter((item) => !!asRecord(item))
        .map((item) => item as Record<string, unknown>);
    }
  }

  const hasRecordShape = Boolean(
    asText(root.TrxCode) ||
    asText(root.OtherTrxCode) ||
    asText(root.VirtualPosOrderId) ||
    asText(root.PaymentId) ||
    asText(root.DealerPaymentId),
  );

  return hasRecordShape ? [root] : [];
}

function callbackAckResponse(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const uiOrigin = resolveUiOrigin(url.searchParams.get("uiOrigin"));
  const intentId = url.searchParams.get("MyTrxCode") || url.searchParams.get("intentId");
  const isPostCallback = req.method === "POST";
  const userAgent = req.headers.get("user-agent") || "";
  const isLikelyBrowserCallback = /mozilla|chrome|safari|firefox|edg/i.test(userAgent.toLowerCase());
  const shouldRedirectClient = !isPostCallback || isLikelyBrowserCallback;

  if (!intentId) {
    if (shouldRedirectClient) return Response.redirect(`${uiOrigin}/payment-failed?code=no_intent`, 302);
    return callbackAckResponse();
  }

  try {
    const { data: intentRow } = await supabase
      .from("payment_intents")
      .select("gateway_trx_code, threed_session_ref")
      .eq("id", intentId)
      .maybeSingle();
    const gatewayTrxCode = asText(intentRow?.gateway_trx_code);

    let callbackData: any = {};
    const contentType = req.headers.get("content-type") || "";

    // 1. Parse Callback Data (Moka sends results via POST form-data usually)
    if (req.method === "POST") {
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        callbackData = Object.fromEntries(formData.entries());
      } else if (contentType.includes("application/json")) {
        callbackData = await req.json().catch(() => ({}));
      }
    } else {
      // Check query params just in case
      callbackData = Object.fromEntries(url.searchParams.entries());
    }

    // Always log the incoming callback hit using allowed 'inquiry' operation
    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: { method: req.method, contentType, callbackData },
      success: true
    });

    const callbackNormalized = {
      resultCode: asText(callbackData?.ResultCode ?? callbackData?.resultCode),
      isSuccessful: asText(callbackData?.IsSuccessful ?? callbackData?.isSuccessful),
      trxStatus: asText(callbackData?.TrxStatus ?? callbackData?.trxStatus),
      paymentStatus: asText(callbackData?.PaymentStatus ?? callbackData?.paymentStatus),
      bankResultCode: asText(callbackData?.BankResultCode ?? callbackData?.bankResultCode),
      resultMessage: asText(callbackData?.ResultMessage ?? callbackData?.resultMessage),
      trxCode: asText(callbackData?.TrxCode ?? callbackData?.trxCode),
      otherTrxCode: asText(callbackData?.OtherTrxCode ?? callbackData?.otherTrxCode),
      hashValue: asText(callbackData?.hashValue ?? callbackData?.HashValue),
    };

    const codeForHash = asText(intentRow?.threed_session_ref);
    const providedHashValue = toLowerSafe(callbackNormalized.hashValue);
    const hashValidation = {
      provided: providedHashValue.length > 0,
      codeForHashPresent: codeForHash.length > 0,
      expectedSuccessHash: "",
      expectedFailHash: "",
      isValid: false,
      matchedOutcome: "",
    };

    if (hashValidation.provided && hashValidation.codeForHashPresent) {
      hashValidation.expectedSuccessHash = await sha256Hex(`${codeForHash}T`);
      hashValidation.expectedFailHash = await sha256Hex(`${codeForHash}F`);
      hashValidation.isValid =
        providedHashValue === hashValidation.expectedSuccessHash ||
        providedHashValue === hashValidation.expectedFailHash;
      hashValidation.matchedOutcome =
        providedHashValue === hashValidation.expectedSuccessHash
          ? "t"
          : providedHashValue === hashValidation.expectedFailHash
            ? "f"
            : "";
    }

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: {
        type: "callback_hash_validation_v1",
        provided: hashValidation.provided,
        codeForHashPresent: hashValidation.codeForHashPresent,
      },
      response_payload: {
        hashValidation,
      },
      success: !hashValidation.provided || !hashValidation.codeForHashPresent || hashValidation.isValid,
      error_code: hashValidation.provided && hashValidation.codeForHashPresent && !hashValidation.isValid ? "hash_mismatch" : null,
      error_message: hashValidation.provided && hashValidation.codeForHashPresent && !hashValidation.isValid
        ? "Callback hashValue dogrulamasi basarisiz"
        : null,
    });

    if (hashValidation.provided && hashValidation.codeForHashPresent && !hashValidation.isValid) {
      if (shouldRedirectClient) {
        return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=hash_mismatch`, 302);
      }
      return callbackAckResponse();
    }

    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const shortTrxCode = intentId.replace(/-/g, "").substring(0, 20);
    const normalizedShortTrxCode = normalizeComparable(shortTrxCode);
    const normalizedGatewayTrxCode = normalizeComparable(gatewayTrxCode);
    const normalizedCallbackTrxCode = normalizeComparable(callbackNormalized.trxCode);
    const normalizedCallbackOtherTrxCode = normalizeComparable(callbackNormalized.otherTrxCode);
    const normalizedCallbackAnyTrxCode = normalizeComparable(
      callbackData?.TrxCode ?? callbackData?.trxCode ?? callbackData?.threeDTrxCode ?? callbackData?.ThreeDTrxCode,
    );
    const callbackKeyList = Object.keys(callbackData || {}).sort();

    // 2. Perform detail inquiry first (Java parity), then list inquiry as fallback context.
    const detailRequestPayload: JsonRecord = {
      OtherTrxCode: shortTrxCode,
    };
    if (gatewayTrxCode) {
      detailRequestPayload.TrxCode = gatewayTrxCode;
      detailRequestPayload.VirtualPosOrderId = gatewayTrxCode;
    }

    const detailInquiry = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/GetDealerPaymentTrxDetailList`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PaymentDealerAuthentication: {
          DealerCode: BAKIYEM_DEALER_CODE,
          Username: BAKIYEM_API_USERNAME,
          Password: BAKIYEM_API_PASSWORD,
          CheckKey: checkKey,
        },
        PaymentDealerRequest: detailRequestPayload,
      }),
    });

    const detailInquiryJson = await detailInquiry.json().catch(() => ({ ResultCode: "JSON_ERROR" }));
    const detailInquiryData = detailInquiryJson?.Data;
    const detailRecords = extractProviderRecordList(detailInquiryData);

    // List inquiry remains as fallback and reconciliation context.
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fmtDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

    const inquiry = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/GetPaymentList`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PaymentDealerAuthentication: {
          DealerCode: BAKIYEM_DEALER_CODE,
          Username: BAKIYEM_API_USERNAME,
          Password: BAKIYEM_API_PASSWORD,
          CheckKey: checkKey,
        },
        PaymentDealerRequest: {
          OtherTrxCode: shortTrxCode,
          PaymentStartDate: fmtDate(yesterday),
          PaymentEndDate: fmtDate(now),
        },
      }),
    });

    const inquiryJson = await inquiry.json().catch(() => ({ ResultCode: "JSON_ERROR" }));

    const inquiryData = inquiryJson?.Data;
    const inquiryPaymentList = extractProviderRecordList(inquiryData);

    const matchedDetailByOtherTrxCode = detailRecords.find((item: any) =>
      normalizeComparable(item?.OtherTrxCode) === normalizedShortTrxCode
    );
    const matchedDetailByCallbackOtherTrxCode = normalizedCallbackOtherTrxCode
      ? detailRecords.find((item: any) => normalizeComparable(item?.OtherTrxCode) === normalizedCallbackOtherTrxCode)
      : null;
    const matchedDetailByGatewayTrxCode = normalizedGatewayTrxCode
      ? detailRecords.find((item: any) => normalizeComparable(item?.TrxCode) === normalizedGatewayTrxCode)
      : null;
    const matchedDetailByCallbackTrxCode = normalizedCallbackTrxCode
      ? detailRecords.find((item: any) => normalizeComparable(item?.TrxCode) === normalizedCallbackTrxCode)
      : null;

    const matchedByOtherTrxCode = inquiryPaymentList.find((item: any) =>
      normalizeComparable(item?.OtherTrxCode) === normalizedShortTrxCode
    );
    const matchedByCallbackOtherTrxCode = normalizedCallbackOtherTrxCode
      ? inquiryPaymentList.find((item: any) => normalizeComparable(item?.OtherTrxCode) === normalizedCallbackOtherTrxCode)
      : null;
    const matchedByGatewayTrxCode = normalizedGatewayTrxCode
      ? inquiryPaymentList.find((item: any) => normalizeComparable(item?.TrxCode) === normalizedGatewayTrxCode)
      : null;
    const matchedByCallbackTrxCode = normalizedCallbackTrxCode
      ? inquiryPaymentList.find((item: any) => normalizeComparable(item?.TrxCode) === normalizedCallbackTrxCode)
      : null;

    // Diagnostic-only alias matching (does not affect success/failure decision yet)
    const detailDiagnosticMatchByVirtualPosOrderId = normalizedGatewayTrxCode
      ? detailRecords.find((item: any) => normalizeComparable(item?.VirtualPosOrderId) === normalizedGatewayTrxCode)
      : null;
    const detailDiagnosticMatchByCallbackAnyTrx = normalizedCallbackAnyTrxCode
      ? detailRecords.find((item: any) => normalizeComparable(item?.TrxCode ?? item?.VirtualPosOrderId) === normalizedCallbackAnyTrxCode)
      : null;
    const detailDiagnosticMatchByMerchantOrderId = detailRecords.find((item: any) =>
      normalizeComparable(item?.MerchantOrderId ?? item?.MerchantRef) === normalizedShortTrxCode
    );

    const listDiagnosticMatchByVirtualPosOrderId = normalizedGatewayTrxCode
      ? inquiryPaymentList.find((item: any) => normalizeComparable(item?.VirtualPosOrderId) === normalizedGatewayTrxCode)
      : null;
    const listDiagnosticMatchByCallbackAnyTrx = normalizedCallbackAnyTrxCode
      ? inquiryPaymentList.find((item: any) => normalizeComparable(item?.TrxCode ?? item?.VirtualPosOrderId) === normalizedCallbackAnyTrxCode)
      : null;
    const listDiagnosticMatchByMerchantOrderId = inquiryPaymentList.find((item: any) =>
      normalizeComparable(item?.MerchantOrderId ?? item?.MerchantRef) === normalizedShortTrxCode
    );

    const detailRecordIdSnapshot = detailRecords.slice(0, 5).map((item: any) => ({
      TrxCode: pickFirstText(item, ["TrxCode", "trxCode"]),
      VirtualPosOrderId: pickFirstText(item, ["VirtualPosOrderId", "virtualPosOrderId"]),
      OtherTrxCode: pickFirstText(item, ["OtherTrxCode", "otherTrxCode", "MerchantOrderId", "MerchantRef"]),
      MerchantOrderId: pickFirstText(item, ["MerchantOrderId"]),
      MerchantRef: pickFirstText(item, ["MerchantRef"]),
      TrxStatus: pickFirstText(item, ["TrxStatus", "trxStatus"]),
      PaymentStatus: pickFirstText(item, ["PaymentStatus", "paymentStatus"]),
      ResultCode: pickFirstText(item, ["ResultCode", "resultCode"]),
    }));

    const listRecordIdSnapshot = inquiryPaymentList.slice(0, 5).map((item: any) => ({
      TrxCode: pickFirstText(item, ["TrxCode", "trxCode"]),
      VirtualPosOrderId: pickFirstText(item, ["VirtualPosOrderId", "virtualPosOrderId"]),
      OtherTrxCode: pickFirstText(item, ["OtherTrxCode", "otherTrxCode", "MerchantOrderId", "MerchantRef"]),
      MerchantOrderId: pickFirstText(item, ["MerchantOrderId"]),
      MerchantRef: pickFirstText(item, ["MerchantRef"]),
      TrxStatus: pickFirstText(item, ["TrxStatus", "trxStatus"]),
      PaymentStatus: pickFirstText(item, ["PaymentStatus", "paymentStatus"]),
      ResultCode: pickFirstText(item, ["ResultCode", "resultCode"]),
    }));

    const selectedProviderRecordForDebug =
      matchedDetailByCallbackOtherTrxCode ||
      matchedDetailByOtherTrxCode ||
      matchedDetailByGatewayTrxCode ||
      matchedDetailByCallbackTrxCode ||
      matchedByCallbackOtherTrxCode ||
      matchedByOtherTrxCode ||
      matchedByGatewayTrxCode ||
      matchedByCallbackTrxCode ||
      null;

    const selectedProviderRecordSource =
      matchedDetailByCallbackOtherTrxCode ? "detail:callback_other_trx_code"
        : matchedDetailByOtherTrxCode ? "detail:other_trx_code"
          : matchedDetailByGatewayTrxCode ? "detail:gateway_trx_code"
            : matchedDetailByCallbackTrxCode ? "detail:callback_trx_code"
              : matchedByCallbackOtherTrxCode ? "list:callback_other_trx_code"
                : matchedByOtherTrxCode ? "list:other_trx_code"
                  : matchedByGatewayTrxCode ? "list:gateway_trx_code"
                    : matchedByCallbackTrxCode ? "list:callback_trx_code"
                      : "none";

    // Log detail inquiry result
    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: { shortTrxCode, gatewayTrxCode, type: "GetDealerPaymentTrxDetailList" },
      response_payload: detailInquiryJson,
      success: detailInquiryJson?.ResultCode === "Success",
    });

    // Log list inquiry result (fallback / reconciliation context)
    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: { shortTrxCode, gatewayTrxCode, type: "GetPaymentList" },
      response_payload: inquiryJson,
      success: inquiryJson?.ResultCode === "Success"
    });

    // Extra diagnostics log to validate callback/inquiry mapping assumptions
    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: {
        type: "status_diagnostics_v3",
        shortTrxCode,
        gatewayTrxCode,
        callbackKeyList,
        callbackNormalized,
        normalizedIdentifiers: {
          normalizedShortTrxCode,
          normalizedGatewayTrxCode,
          normalizedCallbackTrxCode,
          normalizedCallbackOtherTrxCode,
          normalizedCallbackAnyTrxCode,
        },
        detailInquiryShape: {
          httpStatus: detailInquiry.status,
          rootResultCode: asText(detailInquiryJson?.ResultCode),
          dataType: Array.isArray(detailInquiryData) ? "array" : typeof detailInquiryData,
          recordCount: detailRecords.length,
        },
        listInquiryShape: {
          httpStatus: inquiry.status,
          rootResultCode: asText(inquiryJson?.ResultCode),
          dataType: Array.isArray(inquiryData) ? "array" : typeof inquiryData,
          hasPaymentListArray: Array.isArray(inquiryData?.PaymentList),
          paymentListCount: inquiryPaymentList.length
        }
      },
      response_payload: {
        matchedDetailByOtherTrxCode: !!matchedDetailByOtherTrxCode,
        matchedDetailByCallbackOtherTrxCode: !!matchedDetailByCallbackOtherTrxCode,
        matchedDetailByGatewayTrxCode: !!matchedDetailByGatewayTrxCode,
        matchedDetailByCallbackTrxCode: !!matchedDetailByCallbackTrxCode,
        matchedByOtherTrxCode: !!matchedByOtherTrxCode,
        matchedByCallbackOtherTrxCode: !!matchedByCallbackOtherTrxCode,
        matchedByGatewayTrxCode: !!matchedByGatewayTrxCode,
        matchedByCallbackTrxCode: !!matchedByCallbackTrxCode,
        diagnosticMatchByAliases: {
          detailByVirtualPosOrderId: !!detailDiagnosticMatchByVirtualPosOrderId,
          detailByCallbackAnyTrx: !!detailDiagnosticMatchByCallbackAnyTrx,
          detailByMerchantOrderId: !!detailDiagnosticMatchByMerchantOrderId,
          listByVirtualPosOrderId: !!listDiagnosticMatchByVirtualPosOrderId,
          listByCallbackAnyTrx: !!listDiagnosticMatchByCallbackAnyTrx,
          listByMerchantOrderId: !!listDiagnosticMatchByMerchantOrderId,
        },
        selectedProviderRecordSource,
        selectedProviderRecordForDebug,
        detailRecordIdSnapshot,
        listRecordIdSnapshot,
      },
      success: true
    });

    // 3. Status logic
    const matchedRecord = selectedProviderRecordForDebug;
    const callbackResultCode = callbackNormalized.resultCode;
    const callbackIsSuccessful = toLowerSafe(callbackNormalized.isSuccessful);
    const callbackBankResultCode = asText(callbackNormalized.bankResultCode).trim();

    const inquiryResultCode = asText(matchedRecord?.ResultCode ?? detailInquiryJson?.ResultCode ?? inquiryJson?.ResultCode);
    const inquiryTrxStatus = asText(matchedRecord?.TrxStatus);
    const inquiryPaymentStatus = asText(matchedRecord?.PaymentStatus);

    const callbackOutcomeFromHash = hashValidation.matchedOutcome;
    const callbackHasHashOutcome = callbackOutcomeFromHash === "t" || callbackOutcomeFromHash === "f";
    const callbackMessageIndicatesFailure = /(hata|error|fail|failed|unsuccessful|declined|reject|red)/i.test(
      callbackNormalized.resultMessage,
    );

    const callbackIndicatesFailure =
      callbackOutcomeFromHash === "f" ||
      ["false", "0", "fail", "failed", "unsuccessful"].includes(callbackIsSuccessful) ||
      (callbackBankResultCode.length > 0 && !["0", "00"].includes(callbackBankResultCode)) ||
      callbackMessageIndicatesFailure;

    const callbackIndicatesSuccess =
      callbackOutcomeFromHash === "t" ||
      (!callbackHasHashOutcome && (
        ["true", "1", "success", "successful"].includes(callbackIsSuccessful) ||
        (isSuccessResultCode(callbackResultCode) && ["", "0", "00"].includes(callbackBankResultCode))
      ));

    const inquiryIndicatesSuccess =
      !!matchedRecord &&
      (["1", "2"].includes(inquiryTrxStatus) || ["1", "2"].includes(inquiryPaymentStatus));

    const resultCode = callbackResultCode || inquiryResultCode || asText(detailInquiryJson?.ResultCode) || asText(inquiryJson?.ResultCode) || "fail";
    const trxStatus = callbackNormalized.trxStatus || inquiryTrxStatus || "unknown";
    const paymentStatus = callbackNormalized.paymentStatus || inquiryPaymentStatus || "";

    const bankCode =
      callbackNormalized.bankResultCode ||
      asText(matchedRecord?.BankResultCode ?? matchedRecord?.BankCode) ||
      "";

    const resMsg =
      callbackNormalized.resultMessage ||
      asText(matchedRecord?.ResultMessage ?? detailInquiryData?.ResultMessage ?? detailInquiryJson?.ResultMessage ?? inquiryData?.ResultMessage ?? inquiryJson?.ResultMessage) ||
      "";

    const isActuallySuccess = !callbackIndicatesFailure && (callbackIndicatesSuccess || inquiryIndicatesSuccess);
    const effectiveFailureCode = callbackOutcomeFromHash === "f"
      ? "3d_auth_failed"
      : callbackMessageIndicatesFailure && isSuccessResultCode(resultCode)
        ? "callback_declined"
        : resultCode || "fail";

    const likelyUpstreamDecline =
      callbackOutcomeFromHash === "f" &&
      callbackBankResultCode.length > 0 &&
      callbackMessageIndicatesFailure;

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: {
        type: "status_eval_compare_v4",
        resultCode,
        effectiveFailureCode,
        trxStatus,
        paymentStatus,
        bankCode,
        callbackIndicatesFailure,
        callbackIndicatesSuccess,
        inquiryIndicatesSuccess,
        callbackMessageIndicatesFailure,
        isActuallySuccess,
        likelyUpstreamDecline,
        callbackNormalized,
        callbackHashValidation: hashValidation,
        selectedProviderRecordSource,
        detailInquiryResultCode: asText(detailInquiryJson?.ResultCode),
        listInquiryResultCode: asText(inquiryJson?.ResultCode),
      },
      response_payload: {
        matchedRecord,
      },
      success: true
    });

    if (isActuallySuccess) {
      const { data: orderData, error: finalizeError } = await supabase.rpc("finalize_intent_create_order_v1", {
        p_intent_id: intentId,
        p_gateway_result: {
          callback: callbackData,
          inquiry: inquiryJson,
          detailInquiry: detailInquiryJson,
          matchedRecord,
          selectedProviderRecordSource,
          statusEvaluation: {
            resultCode,
            trxStatus,
            paymentStatus,
            bankCode,
            callbackIndicatesFailure,
            callbackIndicatesSuccess,
            inquiryIndicatesSuccess,
            isActuallySuccess,
          },
        }
      });

      if (finalizeError) {
        await supabase.from("payment_transactions").insert({
          intent_id: intentId,
          operation: "finalize",
          success: false,
          error_message: finalizeError.message
        });
        if (shouldRedirectClient) {
          return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=finalize_err`, 302);
        }

        return new Response("FINALIZE_ERROR", {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      if (shouldRedirectClient) {
        return Response.redirect(`${uiOrigin}/order-confirmation?orderId=${orderData?.order_id || orderData?.orderId || ""}`, 302);
      }
      return callbackAckResponse();
    }

    await supabase
      .from("payment_intents")
      .update({ status: "failed", gateway_status: `callback_failed:${effectiveFailureCode || "unknown"}` })
      .eq("id", intentId)
      .in("status", ["pending", "awaiting_3d"]);

    // 4. Detailed Failure
    if (shouldRedirectClient) {
      return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=${effectiveFailureCode || "fail"}&trxStatus=${trxStatus || "unknown"}&bankCode=${bankCode}&msg=${encodeURIComponent(resMsg)}`, 302);
    }
    return callbackAckResponse();

  } catch (e: any) {
    console.error("3D Return Exception:", e);
    if (shouldRedirectClient) {
      return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=exception&msg=${encodeURIComponent(e?.message || String(e))}`, 302);
    }
    return new Response("CALLBACK_EXCEPTION", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
