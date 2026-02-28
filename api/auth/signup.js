import {
  assertValidAuthPostRequest,
  buildRefreshCookie,
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sanitizeSignupResponse,
  sendJson,
} from "./_shared.js";

function normalizeOptionalString(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 32) return null;
  if (!/^[0-9+()\-\s]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeSignupProfileData(input) {
  const payload = {
    user_type: "individual",
  };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return payload;
  }

  const fullName = normalizeOptionalString(input.full_name, 120);
  if (fullName) {
    payload.full_name = fullName;
  }

  const phone = normalizePhone(input.phone);
  if (phone) {
    payload.phone = phone;
  }

  return payload;
}

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

    const hasUser = Boolean(data?.user);
    const hasAccessToken = typeof data?.access_token === "string" && data.access_token.length > 0;
    const hasRefreshToken = typeof data?.refresh_token === "string" && data.refresh_token.length > 0;
    const hasUpstreamErrorMessage = typeof data?.error === "string"
      || typeof data?.msg === "string"
      || typeof data?.error_description === "string";

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Signup failed");
      return sendJson(res, response.status || 400, { error: message });
    }

    const shouldSynthesizePendingUser = !hasUser
      && !hasAccessToken
      && !hasRefreshToken
      && !hasUpstreamErrorMessage;

    const normalizedSignupPayload = shouldSynthesizePendingUser
      ? {
        ...(data && typeof data === "object" ? data : {}),
        user: { email, pending_confirmation: true },
      }
      : data;

    if (normalizedSignupPayload?.refresh_token && normalizedSignupPayload?.access_token) {
      res.setHeader("Set-Cookie", buildRefreshCookie(normalizedSignupPayload.refresh_token, req));
    }

    return sendJson(res, 200, sanitizeSignupResponse(normalizedSignupPayload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected signup error";
    return sendJson(res, 500, { error: message });
  }
}
