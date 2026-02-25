import { assertValidAuthPostRequest, buildClearRefreshCookie, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!assertValidAuthPostRequest(req, res)) {
    return;
  }

  res.setHeader("Set-Cookie", buildClearRefreshCookie(req));
  return sendJson(res, 200, { success: true });
}
