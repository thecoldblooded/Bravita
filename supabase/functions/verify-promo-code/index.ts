/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  getCorsHeaders,
  getStringField,
  getUserFromRequest,
  jsonResponse,
  readJsonBody,
} from "../_shared/edge-security.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req, 4096);
    const code = getStringField(body, "code");
    if (!code || code.length > 64) {
      return jsonResponse(req, 400, { valid: false, message: "Promosyon kodu geçerli değil" });
    }

    const supabase = createServiceClient();
    const user = await getUserFromRequest(req, supabase);
    const { data, error } = await supabase.rpc("verify_promo_code_for_actor_v1", {
      p_actor_id: user?.id ?? null,
      p_code: code,
    });

    if (error) {
      return jsonResponse(req, 400, { valid: false, message: "Promosyon kodu doğrulanamadı" });
    }

    return jsonResponse(req, 200, data ?? { valid: false, message: "Promosyon kodu geçerli değil" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "PAYLOAD_TOO_LARGE" ? 413 : 400;
    return jsonResponse(req, status, { valid: false, message: "İstek işlenemedi" });
  }
});

