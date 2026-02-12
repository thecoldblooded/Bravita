import {
  buildRefreshCookie,
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sanitizeSignupResponse,
  sendJson,
} from "./_shared.js";

function normalizeSignupProfileData(input) {
  if (!input || typeof input !== "object") {
    return {};
  }

  const payload = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = parseRequestBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;
    const profileData = normalizeSignupProfileData(body.profileData);

    if (!email || !password) {
      return sendJson(res, 400, { error: "Email and password are required" });
    }

    const signupPayload = {
      email,
      password,
      data: profileData,
    };

    if (captchaToken) {
      signupPayload.gotrue_meta_security = { captcha_token: captchaToken };
    }

    const { response, data } = await callSupabaseAuth("/auth/v1/signup", {
      method: "POST",
      body: signupPayload,
    });

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Signup failed");
      return sendJson(res, response.status || 400, { error: message });
    }

    if (data?.refresh_token && data?.access_token) {
      res.setHeader("Set-Cookie", buildRefreshCookie(data.refresh_token, req));
    }

    return sendJson(res, 200, sanitizeSignupResponse(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected signup error";
    return sendJson(res, 500, { error: message });
  }
}
