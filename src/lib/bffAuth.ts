const BFF_AUTH_ENABLED = String(import.meta.env.VITE_USE_BFF_AUTH ?? "true").toLowerCase() === "true";

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
  captchaToken?: string;
  profileData: Record<string, unknown>;
}

const BFF_SUPABASE_REFRESH_TOKEN_PLACEHOLDER = "bff-cookie-managed-refresh-token";

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

async function authRequest<T>(path: string, init: AuthRequestInit = {}): Promise<T | null> {
  const { ignoreUnauthorized = false, ...requestInit } = init;

  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(requestInit.headers ?? {}),
    },
    ...requestInit,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (ignoreUnauthorized && response.status === 401) {
      return null;
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

export async function resendSignupConfirmationWithBff(email: string) {
  await authRequest<{ success: boolean }>("/api/auth/resend", {
    method: "POST",
    body: JSON.stringify({
      email,
      type: "signup",
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
  return authRequest<BffSessionPayload>("/api/auth/session", {
    method: "GET",
    ignoreUnauthorized: true,
  });
}

export async function logoutBffSession() {
  await authRequest<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
    body: "{}",
    ignoreUnauthorized: true,
  });
}
