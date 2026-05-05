import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://bravita.com.tr",
  "https://www.bravita.com.tr",
  "https://bravita.vercel.app",
  "http://localhost:8080",
];

const EXTRA_ALLOWED_ORIGINS = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXTRA_ALLOWED_ORIGINS]));

export function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service configuration");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function jsonResponse(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function getBearerToken(req: Request): string {
  const fromUserHeader = (req.headers.get("x-user-jwt") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (fromUserHeader) return fromUserHeader;

  return (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

export async function readJsonBody(req: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("INVALID_JSON");
  }

  return body as Record<string, unknown>;
}

export async function getUserFromRequest(req: Request, supabase: ReturnType<typeof createServiceClient>) {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return data.user;
}

export async function verifyHCaptchaToken(token: unknown): Promise<boolean> {
  const captchaToken = typeof token === "string" ? token.trim() : "";
  if (!captchaToken) return false;

  const hCaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY")?.trim() ?? "";
  if (!hCaptchaSecret) {
    throw new Error("MISSING_HCAPTCHA_SECRET");
  }

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `response=${encodeURIComponent(captchaToken)}&secret=${encodeURIComponent(hCaptchaSecret)}`,
  });

  if (!response.ok) return false;
  const payload = await response.json().catch(() => null);
  return payload?.success === true;
}

export function getStringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

