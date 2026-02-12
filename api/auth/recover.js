import {
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sendJson,
} from "./_shared.js";

function buildRecoverPath(redirectTo) {
  if (typeof redirectTo !== "string" || redirectTo.trim().length === 0) {
    return "/auth/v1/recover";
  }

  const query = new URLSearchParams({ redirect_to: redirectTo.trim() }).toString();
  return `/auth/v1/recover?${query}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = parseRequestBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;

    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    const payload = { email };
    if (captchaToken) {
      payload.gotrue_meta_security = { captcha_token: captchaToken };
    }

    const { response, data } = await callSupabaseAuth(buildRecoverPath(redirectTo), {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Password recovery request failed");
      return sendJson(res, response.status || 400, { error: message });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected password recovery error";
    return sendJson(res, 500, { error: message });
  }
}
