import {
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sendJson,
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = parseRequestBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const type = typeof body.type === "string" ? body.type : "signup";

    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    const { response, data } = await callSupabaseAuth("/auth/v1/resend", {
      method: "POST",
      body: { email, type },
    });

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Resend failed");
      return sendJson(res, response.status || 400, { error: message });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected resend error";
    return sendJson(res, 500, { error: message });
  }
}
