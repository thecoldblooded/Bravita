import {
  parseRequestBody,
  buildRefreshCookie,
  exchangePasswordForSession,
  sendJson,
  sanitizeSessionResponse,
  extractAuthErrorMessage,
  assertValidAuthPostRequest,
  logAuthDiagnostic,
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    logAuthDiagnostic("login_method_not_allowed", req, {
      allow: "POST",
    });
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!assertValidAuthPostRequest(req, res)) {
    logAuthDiagnostic("login_origin_rejected", req);
    return;
  }

  try {
    const body = parseRequestBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;

    logAuthDiagnostic("login_attempt", req, {
      emailPresent: email.length > 0,
      passwordPresent: password.length > 0,
      captchaProvided: Boolean(captchaToken),
    });

    if (!email || !password) {
      return sendJson(res, 400, { error: "Email and password are required" });
    }

    const { response, data } = await exchangePasswordForSession(email, password, captchaToken);

    if (!response.ok || !data?.refresh_token || !data?.access_token) {
      const message = extractAuthErrorMessage(data, "Authentication failed");
      logAuthDiagnostic("login_failed", req, {
        status: response.status || 401,
        hasRefreshToken: Boolean(data?.refresh_token),
        hasAccessToken: Boolean(data?.access_token),
        reason: message,
      });
      return sendJson(res, response.status || 401, { error: message });
    }

    res.setHeader("Set-Cookie", buildRefreshCookie(data.refresh_token, req));
    logAuthDiagnostic("login_success", req, {
      status: 200,
      hasUser: Boolean(data?.user),
    });
    return sendJson(res, 200, sanitizeSessionResponse(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected login error";
    logAuthDiagnostic("login_exception", req, {
      status: 500,
      reason: message,
    });
    return sendJson(res, 500, { error: message });
  }
}
