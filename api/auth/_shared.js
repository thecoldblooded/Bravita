import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const REFRESH_COOKIE_NAME = "bravita_refresh_token";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_COOKIE_NAME = "bravita_oauth_state";
const OAUTH_CODE_VERIFIER_COOKIE_NAME = "bravita_oauth_code_verifier";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;
const DEFAULT_SITE_URL = "https://bravita.com.tr";
const DEFAULT_ALLOWED_AUTH_ORIGINS = [
  "https://bravita.com.tr",
  "https://bravita.vercel.app",
  "https://www.bravita.com.tr",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
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

function authDebugEnabled() {
  return String(process.env.AUTH_DEBUG_LOGS ?? "false").toLowerCase() === "true";
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return typeof value === "string" ? value : "";
}

function summarizeCookieHeader(req) {
  const cookieHeader = normalizeHeaderValue(req.headers.cookie);
  if (!cookieHeader) {
    return {
      cookiePresent: false,
      cookieCount: 0,
      hasRefreshCookie: false,
    };
  }

  const cookieParts = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    cookiePresent: true,
    cookieCount: cookieParts.length,
    hasRefreshCookie: cookieParts.some((part) => part.startsWith(`${REFRESH_COOKIE_NAME}=`)),
  };
}

function logAuthDiagnostic(event, req, extra = {}) {
  if (!authDebugEnabled()) {
    return;
  }

  const cookieSummary = summarizeCookieHeader(req);
  const forwardedFor = normalizeHeaderValue(req.headers["x-forwarded-for"]);

  const payload = {
    tag: "auth-debug",
    event,
    timestamp: new Date().toISOString(),
    method: req.method ?? null,
    url: req.url ?? null,
    host: normalizeHeaderValue(req.headers.host) || null,
    origin: extractRequestOrigin(req),
    referer: normalizeHeaderValue(req.headers.referer) || null,
    forwardedHost: normalizeHeaderValue(req.headers["x-forwarded-host"]) || null,
    forwardedProto: normalizeHeaderValue(req.headers["x-forwarded-proto"]) || null,
    forwardedForPresent: forwardedFor.length > 0,
    ...cookieSummary,
    ...extra,
  };

  try {
    console.log(JSON.stringify(payload));
  } catch {
    console.log(`[auth-debug] ${event}`);
  }
}

function assertValidAuthPostRequest(req, res) {
  const requestOrigin = extractRequestOrigin(req);
  const allowedOrigins = loadAllowedAuthOrigins();

  if (!requestOrigin) {
    console.warn("[AUTH] auth_post_forbidden_missing_origin", {
      path: req.url ?? null,
      method: req.method ?? null,
      hasOriginHeader: Boolean(req.headers.origin),
      hasRefererHeader: Boolean(req.headers.referer),
    });
    sendJson(res, 403, { error: "Forbidden: missing origin" });
    return false;
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    console.warn("[AUTH] auth_post_forbidden_invalid_origin", {
      path: req.url ?? null,
      method: req.method ?? null,
      requestOrigin,
      allowedOrigins,
    });
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

function buildScopedCookie(name, value, req, path, maxAgeSeconds) {
  const securePart = isSecureRequest(req) ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=${path}; SameSite=Lax; Max-Age=${maxAgeSeconds}${securePart}`;
}

function buildScopedClearCookie(name, req, path) {
  const securePart = isSecureRequest(req) ? "; Secure" : "";
  return `${name}=; HttpOnly; Path=${path}; SameSite=Lax; Max-Age=0${securePart}`;
}

function buildOAuthStateCookie(state, req) {
  return buildScopedCookie(OAUTH_STATE_COOKIE_NAME, state, req, "/api/auth/oauth", OAUTH_COOKIE_MAX_AGE_SECONDS);
}

function buildOAuthCodeVerifierCookie(codeVerifier, req) {
  return buildScopedCookie(OAUTH_CODE_VERIFIER_COOKIE_NAME, codeVerifier, req, "/api/auth/oauth", OAUTH_COOKIE_MAX_AGE_SECONDS);
}

function buildClearOAuthStateCookie(req) {
  return buildScopedClearCookie(OAUTH_STATE_COOKIE_NAME, req, "/api/auth/oauth");
}

function buildClearOAuthCodeVerifierCookie(req) {
  return buildScopedClearCookie(OAUTH_CODE_VERIFIER_COOKIE_NAME, req, "/api/auth/oauth");
}

function readOAuthStateFromRequest(req) {
  const cookies = parseCookies(req);
  const state = cookies[OAUTH_STATE_COOKIE_NAME];
  return typeof state === "string" && state.length > 0 ? state : null;
}

function readOAuthCodeVerifierFromRequest(req) {
  const cookies = parseCookies(req);
  const codeVerifier = cookies[OAUTH_CODE_VERIFIER_COOKIE_NAME];
  return typeof codeVerifier === "string" && codeVerifier.length > 0 ? codeVerifier : null;
}

function toBase64Url(bufferValue) {
  return bufferValue
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function generateOAuthPkcePair() {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  const state = toBase64Url(randomBytes(24));

  return { verifier, challenge, state };
}

function safeEqualStrings(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function firstForwardedHeaderValue(value) {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) {
    return "";
  }

  return normalized.split(",")[0].trim();
}

function resolveSiteOrigin(req) {
  const allowedOrigins = loadAllowedAuthOrigins();
  const candidates = [];

  const requestOrigin = extractRequestOrigin(req);
  if (requestOrigin) {
    candidates.push(requestOrigin);
  }

  const forwardedHost = firstForwardedHeaderValue(req.headers["x-forwarded-host"]);
  if (forwardedHost) {
    const forwardedProto = firstForwardedHeaderValue(req.headers["x-forwarded-proto"]);
    const protocol = forwardedProto.includes("https") ? "https" : "http";
    const forwardedOrigin = normalizeOrigin(`${protocol}://${forwardedHost}`);
    if (forwardedOrigin) {
      candidates.push(forwardedOrigin);
    }
  }

  const host = firstForwardedHeaderValue(req.headers.host);
  if (host) {
    const protocol = isSecureRequest(req) ? "https" : "http";
    const hostOrigin = normalizeOrigin(`${protocol}://${host}`);
    if (hostOrigin) {
      candidates.push(hostOrigin);
    }
  }

  const configuredSiteOrigin = normalizeOrigin(
    process.env.AUTH_SITE_URL
    || process.env.SITE_URL
    || process.env.VITE_SITE_URL
    || DEFAULT_SITE_URL,
  );
  if (configuredSiteOrigin) {
    candidates.push(configuredSiteOrigin);
  }

  for (const candidate of candidates) {
    if (candidate && allowedOrigins.includes(candidate)) {
      return candidate;
    }
  }

  return configuredSiteOrigin || normalizeOrigin(DEFAULT_SITE_URL) || "https://bravita.com.tr";
}

function buildSiteUrl(req, pathname = "/", query = {}) {
  const target = new URL(resolveSiteOrigin(req));
  target.pathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  target.search = "";

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim().length > 0) {
        target.searchParams.set(key, value);
      }
    });
  }

  return target.toString();
}

function buildGoogleOAuthAuthorizeUrl(req, state, codeChallenge) {
  const { url } = getSupabaseConfig();
  const authorizeUrl = new URL("/auth/v1/authorize", url);
  const callbackUrl = new URL(buildSiteUrl(req, "/api/auth/oauth/callback"));

  callbackUrl.searchParams.set("oauth_state", state);

  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", callbackUrl.toString());
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  return authorizeUrl.toString();
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

async function exchangePkceCodeForSession(authCode, codeVerifier) {
  return callSupabaseAuth("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    body: {
      auth_code: authCode,
      code_verifier: codeVerifier,
    },
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

function sendRedirect(res, location, statusCode = 302) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", location);
  res.end();
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
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_CODE_VERIFIER_COOKIE_NAME,
  parseRequestBody,
  parseCookies,
  readRefreshTokenFromRequest,
  readOAuthStateFromRequest,
  readOAuthCodeVerifierFromRequest,
  buildRefreshCookie,
  buildClearRefreshCookie,
  buildOAuthStateCookie,
  buildOAuthCodeVerifierCookie,
  buildClearOAuthStateCookie,
  buildClearOAuthCodeVerifierCookie,
  generateOAuthPkcePair,
  safeEqualStrings,
  buildSiteUrl,
  buildGoogleOAuthAuthorizeUrl,
  exchangePasswordForSession,
  refreshSessionFromToken,
  exchangePkceCodeForSession,
  callSupabaseAuth,
  sendJson,
  sendRedirect,
  sanitizeSessionResponse,
  sanitizeSignupResponse,
  extractAuthErrorMessage,
  assertValidAuthPostRequest,
  logAuthDiagnostic,
  resolveSiteOrigin,
};
