import {
  parseRequestBody,
  buildRefreshCookie,
  exchangePasswordForSession,
  sendJson,
  sanitizeSessionResponse,
  extractAuthErrorMessage,
  assertValidAuthPostRequest,
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
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;

    if (!email || !password) {
      return sendJson(res, 400, { error: "Email and password are required" });
    }

    const { response, data } = await exchangePasswordForSession(email, password, captchaToken);

    if (!response.ok || !data?.refresh_token || !data?.access_token) {
      const message = extractAuthErrorMessage(data, "Authentication failed");
      return sendJson(res, response.status || 401, { error: message });
    }

    res.setHeader("Set-Cookie", buildRefreshCookie(data.refresh_token, req));
    return sendJson(res, 200, sanitizeSessionResponse(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected login error";
    return sendJson(res, 500, { error: message });
  }
}
