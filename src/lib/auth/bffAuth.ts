const BFF_AUTH_ENABLED = String(import.meta.env.VITE_USE_BFF_AUTH ?? "true").toLowerCase() === "true";
const BFF_UNAVAILABLE_ERROR_MESSAGE = "BFF_AUTH_UNAVAILABLE";
const BFF_SESSION_RESTORE_CACHE_MS = 1500;

export interface BffSessionPayload {
  access_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
  user: unknown;
}

export interface BffSignupResult {
  user: unknown;
  session: BffSessionPayload | null;
}

export interface BffSignupRequest {
  email: string;
  password: string;
  captchaToken?: string | undefined;
  phoneVerificationToken?: string | undefined;
  profileData: Record<string, unknown>;
}

const BFF_SUPABASE_REFRESH_TOKEN_PLACEHOLDER = "bff-cookie-managed-refresh-token";
let restoreBffSessionInFlight: Promise<BffSessionPayload | null> | null = null;
let restoreBffSessionCache: { payload: BffSessionPayload | null; expiresAt: number } | null = null;

export function toSupabaseSessionInput(sessionPayload: BffSessionPayload) {
  return {
    access_token: sessionPayload.access_token,
    refresh_token: BFF_SUPABASE_REFRESH_TOKEN_PLACEHOLDER,
  };
}

export function getBffRefreshDelayMs(expiresAt: number | null, fallbackMs = 10 * 60 * 1000) {
  if (!expiresAt) {
    return fallbackMs;
  }

  const expiresInMs = expiresAt * 1000 - Date.now();
  const refreshLeadTimeMs = 60 * 1000;
  const plannedDelay = expiresInMs - refreshLeadTimeMs;

  if (!Number.isFinite(plannedDelay) || plannedDelay <= 0) {
    return 30 * 1000;
  }

  return Math.max(30 * 1000, Math.min(plannedDelay, fallbackMs));
}

interface AuthRequestInit extends RequestInit {
  ignoreUnauthorized?: boolean;
}

function normalizeErrorMessage(status: number, payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.error, record.msg, record.error_description];
    const firstMessage = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  if (status === 401) {
    return "Unauthorized";
  }

  return fallback;
}

function isBffUnreachableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return error.name === "TypeError"
    && (
      message.includes("failed to fetch")
      || message.includes("networkerror")
      || message.includes("load failed")
    );
}

async function authRequest<T>(path: string, init: AuthRequestInit = {}): Promise<T | null> {
  const { ignoreUnauthorized = false, ...requestInit } = init;

  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(requestInit.headers ?? {}),
      },
      ...requestInit,
    });
  } catch (error) {
    if (isBffUnreachableError(error)) {
      throw new Error(BFF_UNAVAILABLE_ERROR_MESSAGE);
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (ignoreUnauthorized && response.status === 401) {
      return null;
    }

    if (response.status >= 500) {
      throw new Error(BFF_UNAVAILABLE_ERROR_MESSAGE);
    }

    const message = normalizeErrorMessage(response.status, payload, "Authentication request failed");
    throw new Error(message);
  }

  return payload as T;
}

export function isBffAuthEnabled() {
  return BFF_AUTH_ENABLED;
}

export async function loginWithBff(email: string, password: string, captchaToken?: string) {
  return authRequest<BffSessionPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      captchaToken,
    }),
  });
}

export async function signupWithBff(payload: BffSignupRequest) {
  return authRequest<BffSignupResult>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendSignupConfirmationWithBff(email: string, captchaToken?: string) {
  await authRequest<{ success: boolean }>("/api/auth/resend", {
    method: "POST",
    body: JSON.stringify({
      email,
      type: "signup",
      captchaToken,
    }),
  });
}

export async function requestPasswordRecoveryWithBff(email: string, redirectTo: string, captchaToken?: string) {
  await authRequest<{ success: boolean }>("/api/auth/recover", {
    method: "POST",
    body: JSON.stringify({
      email,
      redirectTo,
      captchaToken,
    }),
  });
}

export async function refreshBffSession() {
  return authRequest<BffSessionPayload>("/api/auth/refresh", {
    method: "POST",
    body: "{}",
    ignoreUnauthorized: true,
  });
}

export async function setBffSessionFromClient(access_token: string, refresh_token: string) {
  return authRequest<{ success: boolean }>("/api/auth/set-session", {
    method: "POST",
    body: JSON.stringify({ access_token, refresh_token }),
    ignoreUnauthorized: true,
  });
}

export async function restoreBffSession() {
  const now = Date.now();
  if (restoreBffSessionCache && restoreBffSessionCache.expiresAt > now) {
    return restoreBffSessionCache.payload;
  }

  if (restoreBffSessionInFlight) {
    return restoreBffSessionInFlight;
  }

  restoreBffSessionInFlight = authRequest<BffSessionPayload>("/api/auth/session", {
    method: "GET",
    ignoreUnauthorized: true,
  }).then((payload) => {
    restoreBffSessionCache = {
      payload,
      expiresAt: Date.now() + BFF_SESSION_RESTORE_CACHE_MS,
    };
    return payload;
  }).finally(() => {
    restoreBffSessionInFlight = null;
  });

  return restoreBffSessionInFlight;
}

export function __resetBffSessionRestoreCacheForTests() {
  restoreBffSessionInFlight = null;
  restoreBffSessionCache = null;
}

export async function logoutBffSession() {
  await authRequest<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
    body: "{}",
    ignoreUnauthorized: true,
  });
}

export async function updateProfileWithBff(payload: {
  full_name: string;
  phone: string;
  phoneVerificationToken?: string | undefined;
}) {
  return authRequest<{ success: boolean; profile: unknown }>("/api/auth/update-profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBffUnavailableErrorMessage() {
  return BFF_UNAVAILABLE_ERROR_MESSAGE;
}
