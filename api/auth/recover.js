import {
  assertValidAuthPostRequest,
  callSupabaseAuth,
  extractAuthErrorMessage,
  parseRequestBody,
  sendJson,
} from "./_shared.js";

const DEFAULT_SITE_URL = "https://bravita.com.tr";

const DEFAULT_ALLOWED_RECOVERY_ORIGINS = [
  "https://bravita.com.tr",
  "https://bravita.vercel.app",
  "https://www.bravita.com.tr",
  "http://localhost:8080",
];

function loadAllowedRecoveryOrigins() {
  const configured = String(process.env.ALLOWED_RECOVERY_REDIRECT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (configured.length > 0) return configured;

  const siteUrl = String(process.env.SITE_URL || process.env.VITE_SITE_URL || DEFAULT_SITE_URL).trim();
  if (siteUrl.length > 0) {
    return Array.from(new Set([...DEFAULT_ALLOWED_RECOVERY_ORIGINS, siteUrl]));
  }

  return DEFAULT_ALLOWED_RECOVERY_ORIGINS;
}

function sanitizeRecoverRedirect(redirectTo) {
  if (typeof redirectTo !== "string" || redirectTo.trim().length === 0) {
    return null;
  }

  const allowedOrigins = loadAllowedRecoveryOrigins();
  const fallbackOrigin = allowedOrigins[0] || DEFAULT_SITE_URL;
  const rawValue = redirectTo.trim();

  try {
    if (/^https?:\/\//i.test(rawValue)) {
      const absolute = new URL(rawValue);
      if (!allowedOrigins.includes(absolute.origin)) {
        return null;
      }
      return absolute.toString();
    }

    const normalizedRelative = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
    const absolute = new URL(normalizedRelative, fallbackOrigin);
    if (!allowedOrigins.includes(absolute.origin)) {
      return null;
    }
    return absolute.toString();
  } catch {
    return null;
  }
}

function buildRecoverPath(redirectTo) {
  const safeRedirect = sanitizeRecoverRedirect(redirectTo);
  if (!safeRedirect) {
    return "/auth/v1/recover";
  }

  const query = new URLSearchParams({ redirect_to: safeRedirect }).toString();
  return `/auth/v1/recover?${query}`;
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
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;

    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    const payload = { email };
    if (captchaToken) {
      payload.gotrue_meta_security = { captcha_token: captchaToken };
    }

    const { response, data } = await callSupabaseAuth(buildRecoverPath(redirectTo), {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const message = extractAuthErrorMessage(data, "Password recovery request failed");
      return sendJson(res, response.status || 400, { error: message });
    }

    return sendJson(res, 200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected password recovery error";
    return sendJson(res, 500, { error: message });
  }
}
