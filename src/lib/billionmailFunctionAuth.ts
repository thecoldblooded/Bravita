export function extractBearerToken(value: string | null | undefined): string {
    return String(value ?? "").replace(/^Bearer\s+/i, "").trim();
}

export function buildBillionMailFunctionHeaders(
    authHeaders: Record<string, string>,
    anonKey: string,
): Record<string, string> | null {
    const normalizedAnonKey = extractBearerToken(anonKey);
    const userJwt = extractBearerToken(authHeaders["x-user-jwt"] ?? authHeaders.Authorization);

    if (!normalizedAnonKey || !userJwt) {
        return null;
    }

    return {
        Authorization: `Bearer ${normalizedAnonKey}`,
        apikey: normalizedAnonKey,
        "x-user-jwt": userJwt,
    };
}

export function isInvalidFunctionJwtResponse(status?: number, message?: string): boolean {
    if (status !== 401) {
        return false;
    }

    const normalizedMessage = String(message ?? "").toLowerCase();
    return normalizedMessage.includes("invalid jwt") ||
        (normalizedMessage.includes("jwt") && normalizedMessage.includes("invalid"));
}
