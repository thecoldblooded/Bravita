import { isBffAuthEnabled, refreshBffSession, toSupabaseSessionInput } from "@/lib/bffAuth";
import { getSessionSafe, supabase } from "@/lib/supabase";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const expectedAuthIssuer = (() => {
    if (!supabaseUrl) return null;

    try {
        return new URL("/auth/v1", supabaseUrl).toString().replace(/\/+$/, "");
    } catch {
        return null;
    }
})();

interface FunctionAuthHeaderOptions {
    forceRefresh?: boolean;
}

interface SessionData {
    session: {
        access_token?: string;
        user?: { id?: string };
    } | null;
}

interface JwtClaims {
    iss?: string;
    exp?: number;
    aud?: string | string[];
    sub?: string;
}

async function validateAccessTokenWithSupabase(
    accessToken: string,
    context: string,
): Promise<{ valid: boolean; userId: string | null; reason: string }> {
    try {
        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error || !data?.user?.id) {
            const errorMessage = error?.message?.trim() || "auth_get_user_failed";
            const errorStatus = typeof (error as { status?: unknown })?.status === "number"
                ? (error as { status: number }).status
                : null;

            logFunctionAuthDiagnostics("token_rejected_by_auth_api", {
                context,
                errorMessage,
                errorStatus,
            });

            return {
                valid: false,
                userId: null,
                reason: "token_rejected_by_auth_api",
            };
        }

        return {
            valid: true,
            userId: data.user.id,
            reason: "ok",
        };
    } catch (error) {
        logFunctionAuthDiagnostics("token_validation_exception", {
            context,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : String(error),
        });

        return {
            valid: false,
            userId: null,
            reason: "token_validation_exception",
        };
    }
}

function logFunctionAuthDiagnostics(_message: string, _payload: Record<string, unknown>) {
    return;
}

function buildHeaders(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
        "x-user-jwt": accessToken,
    };
}

function decodeBase64Url(value: string): string | null {
    try {
        const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        return atob(padded);
    } catch {
        return null;
    }
}

function parseJwtClaims(accessToken: string): JwtClaims | null {
    const parts = accessToken.split(".");
    if (parts.length < 3) return null;

    const payload = decodeBase64Url(parts[1]);
    if (!payload) return null;

    try {
        const parsed = JSON.parse(payload) as JwtClaims;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

function inspectAccessToken(accessToken: string): { usable: boolean; reason: string; claims: JwtClaims | null } {
    if (accessToken.trim().length === 0) {
        return {
            usable: false,
            reason: "empty_token",
            claims: null,
        };
    }

    const claims = parseJwtClaims(accessToken);
    if (!claims) {
        return {
            usable: false,
            reason: "malformed_jwt",
            claims: null,
        };
    }

    if (typeof claims.exp === "number" && Number.isFinite(claims.exp)) {
        const now = Math.floor(Date.now() / 1000);
        if (now >= claims.exp - 30) {
            return {
                usable: false,
                reason: "token_expired_or_near_expiry",
                claims,
            };
        }
    }

    if (expectedAuthIssuer && typeof claims.iss === "string" && claims.iss.trim().length > 0) {
        const normalizedClaimIssuer = claims.iss.replace(/\/+$/, "");
        if (normalizedClaimIssuer !== expectedAuthIssuer) {
            return {
                usable: false,
                reason: "issuer_mismatch",
                claims,
            };
        }
    }

    return {
        usable: true,
        reason: "ok",
        claims,
    };
}

async function readSessionData(context: string): Promise<SessionData | null> {
    try {
        const { data } = await getSessionSafe();
        return data as SessionData | null;
    } catch (error) {
        logFunctionAuthDiagnostics("getSessionSafe_failed", {
            context,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

async function refreshAccessToken(context: string): Promise<{ accessToken: string; userId: string | null; source: string }> {
    try {
        if (isBffAuthEnabled()) {
            const bffSession = await refreshBffSession();
            const bffAccessToken = bffSession?.access_token?.trim() ?? "";

            if (!bffAccessToken) {
                return { accessToken: "", userId: null, source: "bff_refresh_no_session" };
            }

            const { data, error } = await supabase.auth.setSession(toSupabaseSessionInput(bffSession));
            if (error) {
                logFunctionAuthDiagnostics("bff_setSession_failed", {
                    context,
                    errorName: error.name,
                    errorMessage: error.message,
                });
                return { accessToken: "", userId: null, source: "bff_set_session_failed" };
            }

            const accessToken = data?.session?.access_token?.trim() || bffAccessToken;
            const inspection = inspectAccessToken(accessToken);
            if (!inspection.usable) {
                logFunctionAuthDiagnostics("bff_refresh_invalid_access_token", {
                    context,
                    reason: inspection.reason,
                    iss: inspection.claims?.iss ?? null,
                    exp: inspection.claims?.exp ?? null,
                });

                return {
                    accessToken: "",
                    userId: data?.session?.user?.id ?? null,
                    source: `bff_refresh_${inspection.reason}`,
                };
            }

            const validation = await validateAccessTokenWithSupabase(accessToken, `${context}:bff_refresh`);
            if (!validation.valid) {
                return {
                    accessToken: "",
                    userId: null,
                    source: `bff_refresh_${validation.reason}`,
                };
            }

            return {
                accessToken,
                userId: validation.userId ?? data?.session?.user?.id ?? null,
                source: "bff_refresh",
            };
        }

        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
            logFunctionAuthDiagnostics("refreshSession_failed", {
                context,
                errorName: error.name,
                errorMessage: error.message,
            });
            return { accessToken: "", userId: null, source: "supabase_refresh_failed" };
        }

        const accessToken = data?.session?.access_token?.trim() ?? "";
        const inspection = inspectAccessToken(accessToken);
        if (!inspection.usable) {
            logFunctionAuthDiagnostics("refreshSession_invalid_access_token", {
                context,
                reason: inspection.reason,
                iss: inspection.claims?.iss ?? null,
                exp: inspection.claims?.exp ?? null,
            });

            return {
                accessToken: "",
                userId: data?.session?.user?.id ?? null,
                source: `supabase_refresh_${inspection.reason}`,
            };
        }

        const validation = await validateAccessTokenWithSupabase(accessToken, `${context}:supabase_refresh`);
        if (!validation.valid) {
            return {
                accessToken: "",
                userId: null,
                source: `supabase_refresh_${validation.reason}`,
            };
        }

        return {
            accessToken,
            userId: validation.userId ?? data?.session?.user?.id ?? null,
            source: "supabase_refresh",
        };
    } catch (error) {
        logFunctionAuthDiagnostics("refresh_access_token_exception", {
            context,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : String(error),
            bffEnabled: isBffAuthEnabled(),
        });

        return { accessToken: "", userId: null, source: "refresh_exception" };
    }
}

/**
 * Builds auth headers for Edge Function calls:
 * - Prefer session access token in Authorization when available.
 * - Keep x-user-jwt for backward compatibility with existing function auth extraction.
 * - When requested (forceRefresh) or when token is missing, attempts a one-shot session refresh.
 */
export async function getFunctionAuthHeaders(
    context = "unknown",
    options: FunctionAuthHeaderOptions = {},
): Promise<Record<string, string>> {
    const { forceRefresh = false } = options;

    if (forceRefresh) {
        const refreshed = await refreshAccessToken(context);
        if (refreshed.accessToken.length > 0) {
            logFunctionAuthDiagnostics("resolved", {
                context,
                tokenSource: refreshed.source,
                hasSession: true,
                sessionUserId: refreshed.userId,
                hasAuthorization: true,
                hasUserJwt: true,
                forcedRefresh: true,
            });

            return buildHeaders(refreshed.accessToken);
        }

        logFunctionAuthDiagnostics("forced_refresh_failed", {
            context,
            refreshSource: refreshed.source,
            hasAuthorization: false,
            hasUserJwt: false,
        });

        return {};
    }

    const sessionData = await readSessionData(context);
    const accessToken = sessionData?.session?.access_token?.trim() ?? "";
    const sessionTokenInspection = inspectAccessToken(accessToken);

    if (accessToken.length > 0 && sessionTokenInspection.usable) {
        const sessionValidation = await validateAccessTokenWithSupabase(accessToken, `${context}:session`);

        if (sessionValidation.valid) {
            logFunctionAuthDiagnostics("resolved", {
                context,
                tokenSource: "session",
                hasSession: !!sessionData?.session,
                sessionUserId: sessionValidation.userId ?? sessionData?.session?.user?.id ?? null,
                hasAuthorization: true,
                hasUserJwt: true,
                forcedRefresh: false,
            });

            return buildHeaders(accessToken);
        }

        logFunctionAuthDiagnostics("session_access_token_invalid", {
            context,
            reason: sessionValidation.reason,
            iss: sessionTokenInspection.claims?.iss ?? null,
            exp: sessionTokenInspection.claims?.exp ?? null,
        });
    }

    if (accessToken.length > 0 && !sessionTokenInspection.usable) {
        logFunctionAuthDiagnostics("session_access_token_invalid", {
            context,
            reason: sessionTokenInspection.reason,
            iss: sessionTokenInspection.claims?.iss ?? null,
            exp: sessionTokenInspection.claims?.exp ?? null,
        });
    }

    // Best-effort recovery for stale/expired/invalid in-memory session states.
    const refreshed = await refreshAccessToken(`${context}:missing_or_invalid_session`);
    if (refreshed.accessToken.length > 0) {
        logFunctionAuthDiagnostics("resolved", {
            context,
            tokenSource: refreshed.source,
            hasSession: true,
            sessionUserId: refreshed.userId,
            hasAuthorization: true,
            hasUserJwt: true,
            forcedRefresh: false,
        });

        return buildHeaders(refreshed.accessToken);
    }

    const missingSessionReason = accessToken.length > 0
        ? sessionTokenInspection.reason
        : (sessionData?.session ? "missing_access_token" : "missing_session");

    logFunctionAuthDiagnostics("resolved", {
        context,
        tokenSource: "none",
        reason: missingSessionReason,
        hasSession: !!sessionData?.session,
        sessionUserId: sessionData?.session?.user?.id ?? null,
        hasAuthorization: false,
        hasUserJwt: false,
        anonFallbackConfigured: Boolean(anonKey && anonKey.length > 0),
        forcedRefresh: false,
    });

    return {};
}
