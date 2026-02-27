const REFRESH_COOKIE_NAME = "bravita_refresh_token";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_SITE_URL = "https://bravita.com.tr";
const DEFAULT_ALLOWED_AUTH_ORIGINS = [
  "https://bravita.com.tr",
  "https://bravita.vercel.app",
  "https://www.bravita.com.tr",
  "http://localhost:8080",
];

function normalizeOrigin(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function loadAllowedAuthOrigins() {
  const configured = String(process.env.ALLOWED_AUTH_ORIGINS || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter((value) => Boolean(value));

  const siteUrl = normalizeOrigin(
    process.env.SITE_URL || process.env.VITE_SITE_URL || DEFAULT_SITE_URL,
  );

  const merged = [
    ...configured,
    ...(siteUrl ? [siteUrl] : []),
    ...DEFAULT_ALLOWED_AUTH_ORIGINS,
  ];

  return Array.from(new Set(merged));
}

function extractRequestOrigin(req) {
  const fromOriginHeader = normalizeOrigin(req.headers.origin);
  if (fromOriginHeader) return fromOriginHeader;

  const refererHeader = typeof req.headers.referer === "string" ? req.headers.referer.trim() : "";
  if (!refererHeader) return null;

  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
}

function assertValidAuthPostRequest(req, res) {
  const requestOrigin = extractRequestOrigin(req);
  const allowedOrigins = loadAllowedAuthOrigins();

  if (!requestOrigin) {
    sendJson(res, 403, { error: "Forbidden: missing origin" });
    return false;
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    sendJson(res, 403, { error: "Forbidden: invalid origin" });
    return false;
  }

  return true;
}

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
  const payload = { email, password };
  if (captchaToken) {
    payload.gotrue_meta_security = { captcha_token: captchaToken };
  }

  return callSupabaseAuth("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: payload,
  });
}

async function refreshSessionFromToken(refreshToken) {
  return callSupabaseAuth("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

async function callSupabaseAuth(path, options = {}) {
  const { url, anonKey } = getSupabaseConfig();
  const method = options.method ?? "POST";
  const accessToken = typeof options.accessToken === "string" && options.accessToken.length > 0
    ? options.accessToken
    : anonKey;

  const requestInit = {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${url}${path}`, requestInit);
  const data = await response.json().catch(() => null);
  return { response, data };
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).setHeader("Cache-Control", "no-store").json(payload);
}

function sanitizeSessionResponse(sessionPayload) {
  return {
    access_token: sessionPayload?.access_token ?? null,
    expires_at: sessionPayload?.expires_at ?? null,
    expires_in: sessionPayload?.expires_in ?? null,
    token_type: sessionPayload?.token_type ?? "bearer",
    user: sessionPayload?.user ?? null,
  };
}

function sanitizeSignupResponse(signupPayload) {
  const hasSessionToken = typeof signupPayload?.access_token === "string" && signupPayload.access_token.length > 0;

  return {
    user: signupPayload?.user ?? null,
    session: hasSessionToken ? sanitizeSessionResponse(signupPayload) : null,
  };
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
  callSupabaseAuth,
  sendJson,
  sanitizeSessionResponse,
  sanitizeSignupResponse,
  extractAuthErrorMessage,
  assertValidAuthPostRequest,
};
