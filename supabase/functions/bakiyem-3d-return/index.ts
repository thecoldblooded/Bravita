// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_APP_BASE_URL = "https://bravita.com.tr";

const BAKIYEM_BASE_URL = "https://service.moka.com";
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

serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const uiOrigin = url.searchParams.get("uiOrigin") || DEFAULT_APP_BASE_URL;
  const intentId = url.searchParams.get("intentId");

  if (!intentId) return Response.redirect(`${uiOrigin}/payment-failed?code=no_intent`, 302);

  try {
    const { data: intentRow } = await supabase
      .from("payment_intents")
      .select("gateway_trx_code")
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

    const checkKey = await sha256Hex(`${BAKIYEM_DEALER_CODE}MK${BAKIYEM_API_USERNAME}PD${BAKIYEM_API_PASSWORD}`);
    const shortTrxCode = intentId.replace(/-/g, "").substring(0, 20);

    // 2. Perform Inquiry
    // We need to provide a date range even if we filter by OtherTrxCode.
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fmtDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

    const inquiry = await fetch(`${BAKIYEM_BASE_URL}/PaymentDealer/GetPaymentList`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PaymentDealerAuthentication: { DealerCode: BAKIYEM_DEALER_CODE, Username: BAKIYEM_API_USERNAME, Password: BAKIYEM_API_PASSWORD, CheckKey: checkKey },
        PaymentDealerRequest: {
          OtherTrxCode: shortTrxCode,
          PaymentStartDate: fmtDate(yesterday),
          PaymentEndDate: fmtDate(now)
        }
      })
    });

    const inquiryJson = await inquiry.json().catch(() => ({ ResultCode: "JSON_ERROR" }));

    const callbackNormalized = {
      resultCode: asText(callbackData?.ResultCode ?? callbackData?.resultCode),
      isSuccessful: asText(callbackData?.IsSuccessful ?? callbackData?.isSuccessful),
      trxStatus: asText(callbackData?.TrxStatus ?? callbackData?.trxStatus),
      paymentStatus: asText(callbackData?.PaymentStatus ?? callbackData?.paymentStatus),
      bankResultCode: asText(callbackData?.BankResultCode ?? callbackData?.bankResultCode),
      resultMessage: asText(callbackData?.ResultMessage ?? callbackData?.resultMessage),
      trxCode: asText(callbackData?.TrxCode ?? callbackData?.trxCode),
    };

    const inquiryData = inquiryJson?.Data;
    const inquiryPaymentList = Array.isArray(inquiryData?.PaymentList)
      ? inquiryData.PaymentList
      : Array.isArray(inquiryData)
        ? inquiryData
        : [];
    const matchedByOtherTrxCode = inquiryPaymentList.find((item: any) =>
      asText(item?.OtherTrxCode).replace(/-/g, "") === shortTrxCode
    );
    const matchedByGatewayTrxCode = gatewayTrxCode
      ? inquiryPaymentList.find((item: any) => asText(item?.TrxCode) === gatewayTrxCode)
      : null;
    const selectedInquiryRecordForDebug =
      matchedByOtherTrxCode ||
      matchedByGatewayTrxCode ||
      inquiryPaymentList[0] ||
      (Array.isArray(inquiryData) ? inquiryData[0] : inquiryData) ||
      null;

    // Log inquiry result
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
        type: "status_diagnostics_v1",
        shortTrxCode,
        gatewayTrxCode,
        callbackNormalized,
        inquiryShape: {
          rootResultCode: asText(inquiryJson?.ResultCode),
          dataType: Array.isArray(inquiryData) ? "array" : typeof inquiryData,
          hasPaymentListArray: Array.isArray(inquiryData?.PaymentList),
          paymentListCount: inquiryPaymentList.length
        }
      },
      response_payload: {
        matchedByOtherTrxCode: !!matchedByOtherTrxCode,
        matchedByGatewayTrxCode: !!matchedByGatewayTrxCode,
        selectedInquiryRecordForDebug
      },
      success: true
    });

    // 3. Status logic
    // We combine data from callback and inquiry
    const mokaData = inquiryJson?.Data?.[0] || inquiryJson?.Data || callbackData;
    const trxStatus = mokaData?.TrxStatus || callbackData?.TrxStatus;
    const paymentStatus = mokaData?.PaymentStatus || callbackData?.PaymentStatus;
    const resultCode = mokaData?.ResultCode || inquiryJson?.ResultCode || callbackData?.ResultCode;

    // In Moka: TrxStatus 1 is Success
    const isActuallySuccess = (resultCode === "Success" || resultCode === "0") &&
      (trxStatus == 1 || paymentStatus == 1 || paymentStatus == 2);

    const previewResultCode = selectedInquiryRecordForDebug?.ResultCode || inquiryJson?.ResultCode || callbackNormalized.resultCode;
    const previewTrxStatus = selectedInquiryRecordForDebug?.TrxStatus ?? callbackNormalized.trxStatus;
    const previewPaymentStatus = selectedInquiryRecordForDebug?.PaymentStatus ?? callbackNormalized.paymentStatus;
    const previewSuccess = (previewResultCode === "Success" || previewResultCode === "0") &&
      (previewTrxStatus == 1 || previewPaymentStatus == 1 || previewPaymentStatus == 2);

    await supabase.from("payment_transactions").insert({
      intent_id: intentId,
      operation: "inquiry",
      request_payload: {
        type: "status_eval_compare_v1",
        oldLogic: { resultCode, trxStatus, paymentStatus, isActuallySuccess },
        previewLogic: {
          resultCode: previewResultCode,
          trxStatus: previewTrxStatus,
          paymentStatus: previewPaymentStatus,
          isActuallySuccess: previewSuccess
        },
        callbackNormalized
      },
      success: true
    });

    if (isActuallySuccess) {
      const { data: orderData, error: finalizeError } = await supabase.rpc("finalize_payment_intent_v1", {
        p_intent_id: intentId,
        p_gateway_response: { callback: callbackData, inquiry: inquiryJson }
      });

      if (finalizeError) {
        await supabase.from("payment_transactions").insert({
          intent_id: intentId,
          operation: "finalize",
          success: false,
          error_message: finalizeError.message
        });
        return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=finalize_err`, 302);
      }

      return Response.redirect(`${uiOrigin}/order-confirmation?orderId=${orderData?.order_id || ""}`, 302);
    }

    // 4. Detailed Failure
    const bankCode = mokaData?.BankResultCode || callbackData?.BankResultCode || "";
    const resMsg = mokaData?.ResultMessage || callbackData?.ResultMessage || "";

    return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=${resultCode || "fail"}&trxStatus=${trxStatus || "unknown"}&bankCode=${bankCode}&msg=${encodeURIComponent(resMsg)}`, 302);

  } catch (e: any) {
    console.error("3D Return Exception:", e);
    return Response.redirect(`${uiOrigin}/payment-failed?intent=${intentId}&code=exception&msg=${encodeURIComponent(e?.message || String(e))}`, 302);
  }
});
