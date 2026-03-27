import { assertValidAuthPostRequest, buildClearRefreshCookie, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!assertValidAuthPostRequest(req, res, {
    rateLimit: {
      bucketKey: "auth:logout",
      maxRequests: 20,
      windowMs: 60 * 1000,
    },
  })) {
    return;
  }

  res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
  return sendJson(res, 200, { success: true });
}
