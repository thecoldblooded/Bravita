const REFRESH_COOKIE_NAME = "bravita_refresh_token";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in server environment");
  }

  return { url, anonKey };
}

function isSecureRequest(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.includes("https");
  }
  return process.env.NODE_ENV === "production";
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rest.join("="));
    acc[key] = value;
    return acc;
  }, {});
}

function readRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[REFRESH_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : null;
}

function buildRefreshCookie(token, req) {
  const securePart = isSecureRequest(req) ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=${REFRESH_COOKIE_MAX_AGE_SECONDS}${securePart}`;
}

function buildClearRefreshCookie(req) {
  const securePart = isSecureRequest(req) ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=0${securePart}`;
}

async function exchangePasswordForSession(email, password, captchaToken) {
  const { url, anonKey } = getSupabaseConfig();

  const payload = { email, password };
  if (captchaToken) {
    payload.gotrue_meta_security = { captcha_token: captchaToken };
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

async function refreshSessionFromToken(refreshToken) {
  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).setHeader("Cache-Control", "no-store").json(payload);
}

function sanitizeSessionResponse(sessionPayload, options = {}) {
  const sanitized = {
    access_token: sessionPayload?.access_token ?? null,
    expires_at: sessionPayload?.expires_at ?? null,
    expires_in: sessionPayload?.expires_in ?? null,
    token_type: sessionPayload?.token_type ?? "bearer",
    user: sessionPayload?.user ?? null,
  };

  if (options.includeRefreshToken) {
    sanitized.refresh_token = sessionPayload?.refresh_token ?? null;
  }

  return sanitized;
}

function extractAuthErrorMessage(payload, fallbackMessage) {
  if (typeof payload?.msg === "string" && payload.msg.trim().length > 0) {
    return payload.msg;
  }
  if (typeof payload?.error_description === "string" && payload.error_description.trim().length > 0) {
    return payload.error_description;
  }
  if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }
  return fallbackMessage;
}

export {
  REFRESH_COOKIE_NAME,
  parseRequestBody,
  parseCookies,
  readRefreshTokenFromRequest,
  buildRefreshCookie,
  buildClearRefreshCookie,
  exchangePasswordForSession,
  refreshSessionFromToken,
  sendJson,
  sanitizeSessionResponse,
  extractAuthErrorMessage,
};
