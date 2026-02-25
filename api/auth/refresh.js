import {
  assertValidAuthPostRequest,
  buildClearRefreshCookie,
  buildRefreshCookie,
  extractAuthErrorMessage,
  readRefreshTokenFromRequest,
  refreshSessionFromToken,
  sanitizeSessionResponse,
  sendJson,
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
    const refreshToken = readRefreshTokenFromRequest(req);
    if (!refreshToken) {
      res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
      return sendJson(res, 401, { error: "No active session" });
    }

    const { response, data } = await refreshSessionFromToken(refreshToken);
    if (!response.ok || !data?.refresh_token || !data?.access_token) {
      res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
      const message = extractAuthErrorMessage(data, "Session refresh failed");
      return sendJson(res, response.status || 401, { error: message });
    }

    res.setHeader("Set-Cookie", buildRefreshCookie(data.refresh_token, req));
    return sendJson(res, 200, sanitizeSessionResponse(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected refresh error";
    res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
    return sendJson(res, 500, { error: message });
  }
}
