import {
  assertValidAuthPostRequest,
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sendJson,
  sendInternalServerError,
  shouldBypassCaptchaForRequest,
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!assertValidAuthPostRequest(req, res)) {
    return;
  }

  try {
    const body = parseRequestBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const type = typeof body.type === "string" ? body.type : "signup";
    const rawCaptchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";
    const parsedCaptchaToken = rawCaptchaToken.length > 0 ? rawCaptchaToken : undefined;
    const bypassCaptcha = shouldBypassCaptchaForRequest(req);
    const captchaToken = bypassCaptcha ? undefined : parsedCaptchaToken;

    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    if (!captchaToken && !bypassCaptcha) {
      return sendJson(res, 400, { error: "Captcha token is required" });
    }

    const payload = { email, type };
    if (captchaToken) {
      payload.gotrue_meta_security = { captcha_token: captchaToken };
    }

    const { response, data } = await callSupabaseAuth("/auth/v1/resend", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Resend failed");
      const isCaptchaError = typeof message === "string" && message.toLowerCase().includes("captcha");
      const statusCode = isCaptchaError && response.status >= 500
        ? 400
        : (response.status || 400);
      return sendJson(res, statusCode, { error: message });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    return sendInternalServerError(res, req, "resend_exception", error);
  }
}
