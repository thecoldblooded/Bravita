import {
    assertValidAuthPostRequest,
    buildRefreshCookie,
    sendJson,
} from "./_shared.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (!assertValidAuthPostRequest(req, res)) {
        return;
    }

    try {
        const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || "{}");
        const { refresh_token, access_token } = body;

        if (!refresh_token || !access_token) {
            return sendJson(res, 400, { error: "Missing tokens" });
        }

        res.setHeader("Set-Cookie", buildRefreshCookie(refresh_token, req));
        return sendJson(res, 200, { success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected set-session error";
        return sendJson(res, 500, { error: message });
    }
}
