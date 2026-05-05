import {
    assertValidAuthPostRequest,
    buildRefreshCookie,
    callSupabaseAuth,
    refreshSessionFromToken,
    sanitizeSessionResponse,
    sendJson,
    sendInternalServerError,
} from "./_shared.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (!assertValidAuthPostRequest(req, res, {
        rateLimit: {
            bucketKey: "auth:set-session",
            maxRequests: 8,
            windowMs: 60 * 1000,
        },
    })) {
        return;
    }

    try {
        const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || "{}");
        const { refresh_token, access_token } = body;

        if (typeof refresh_token !== "string" || typeof access_token !== "string" || !refresh_token || !access_token) {
            return sendJson(res, 400, { error: "Missing tokens" });
        }

        const { response: userResponse, data: userData } = await callSupabaseAuth("/auth/v1/user", {
            method: "GET",
            accessToken,
        });

        const accessTokenUserId = userData?.id ?? userData?.user?.id ?? null;
        if (!userResponse.ok || !accessTokenUserId) {
            return sendJson(res, 401, { error: "Invalid session" });
        }

        const { response: refreshResponse, data: refreshData } = await refreshSessionFromToken(refresh_token);
        const refreshTokenUserId = refreshData?.user?.id ?? null;

        if (!refreshResponse.ok || !refreshData?.refresh_token || !refreshData?.access_token || !refreshTokenUserId) {
            return sendJson(res, 401, { error: "Invalid session" });
        }

        if (refreshTokenUserId !== accessTokenUserId) {
            return sendJson(res, 401, { error: "Invalid session" });
        }

        res.setHeader("Set-Cookie", buildRefreshCookie(refreshData.refresh_token, req));
        return sendJson(res, 200, {
            success: true,
            ...sanitizeSessionResponse(refreshData),
        });
    } catch (error) {
        return sendInternalServerError(res, req, "set_session_exception", error);
    }
}
