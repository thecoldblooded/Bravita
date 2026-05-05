/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  getCorsHeaders,
  getStringField,
  getUserFromRequest,
  jsonResponse,
  readJsonBody,
  verifyHCaptchaToken,
} from "../_shared/edge-security.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req, 12_288);
    const supabase = createServiceClient();
    const user = await getUserFromRequest(req, supabase);

    if (!user) {
      const captchaOk = await verifyHCaptchaToken(body.captchaToken);
      if (!captchaOk) {
        return jsonResponse(req, 403, { error: "Captcha verification failed" });
      }
    }

    const payload = {
      p_actor_id: user?.id ?? null,
      p_name: getStringField(body, "name"),
      p_email: getStringField(body, "email"),
      p_category: getStringField(body, "category") || "general",
      p_subject: getStringField(body, "subject"),
      p_message: getStringField(body, "message"),
    };

    const { data, error } = await supabase.rpc("create_support_ticket_for_actor_v1", payload);
    if (error) {
      return jsonResponse(req, 400, { error: "Support ticket could not be created" });
    }

    const ticket = Array.isArray(data) ? data[0] : data;
    if (!ticket?.id) {
      return jsonResponse(req, 500, { error: "Support ticket ID missing" });
    }

    return jsonResponse(req, 200, { success: true, ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "PAYLOAD_TOO_LARGE" ? 413 : message === "MISSING_HCAPTCHA_SECRET" ? 500 : 400;
    return jsonResponse(req, status, { error: "Request could not be processed" });
  }
});

