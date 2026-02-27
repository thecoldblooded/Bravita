import {
  assertValidAuthPostRequest,
  buildClearRefreshCookie,
  buildRefreshCookie,
  extractAuthErrorMessage,
  readRefreshTokenFromRequest,
  refreshSessionFromToken,
  sanitizeSessionResponse,
  sendJson,
  logAuthDiagnostic,
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    logAuthDiagnostic("session_method_not_allowed", req, {
      allow: "GET, POST",
    });
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (req.method === "POST" && !assertValidAuthPostRequest(req, res)) {
    logAuthDiagnostic("session_post_origin_rejected", req);
    return;
  }

  try {
    const refreshToken = readRefreshTokenFromRequest(req);
    logAuthDiagnostic("session_bootstrap_attempt", req, {
      hasRefreshToken: Boolean(refreshToken),
      method: req.method,
    });

    if (!refreshToken) {
      logAuthDiagnostic("session_no_refresh_cookie", req, {
        status: 401,
      });
      res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
      return sendJson(res, 401, { error: "No active session" });
    }

    // Rotate refresh token on each session bootstrap to reduce token replay window.
    const { response, data } = await refreshSessionFromToken(refreshToken);
    if (!response.ok || !data?.refresh_token || !data?.access_token) {
      const message = extractAuthErrorMessage(data, "Session bootstrap failed");
      logAuthDiagnostic("session_refresh_failed", req, {
        status: response.status || 401,
        hasRefreshToken: Boolean(data?.refresh_token),
        hasAccessToken: Boolean(data?.access_token),
        reason: message,
      });
      res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
      return sendJson(res, response.status || 401, { error: message });
    }

    res.setHeader("Set-Cookie", buildRefreshCookie(data.refresh_token, req));
    logAuthDiagnostic("session_refresh_success", req, {
      status: 200,
      hasUser: Boolean(data?.user),
      expiresAt: data?.expires_at ?? null,
    });
    return sendJson(res, 200, sanitizeSessionResponse(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected session bootstrap error";
    logAuthDiagnostic("session_exception", req, {
      status: 500,
      reason: message,
    });
    res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
    return sendJson(res, 500, { error: message });
  }
}
