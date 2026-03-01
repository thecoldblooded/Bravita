import {
    buildClearOAuthCodeVerifierCookie,
    buildClearOAuthStateCookie,
    buildRefreshCookie,
    buildSiteUrl,
    exchangePkceCodeForSession,
    extractAuthErrorMessage,
    logAuthDiagnostic,
    readOAuthCodeVerifierFromRequest,
    readOAuthStateFromRequest,
    safeEqualStrings,
    sendJson,
    sendRedirect,
} from "../_shared.js";

function clearOAuthCookies(req) {
    return [
        buildClearOAuthStateCookie(req),
        buildClearOAuthCodeVerifierCookie(req),
    ];
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        logAuthDiagnostic("oauth_callback_method_not_allowed", req, {
            allow: "GET",
        });
        res.setHeader("Allow", "GET");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    const code = typeof req.query?.code === "string" ? req.query.code : "";
    const oauthState = typeof req.query?.oauth_state === "string" ? req.query.oauth_state : "";
    const state = oauthState || (typeof req.query?.state === "string" ? req.query.state : "");
    const upstreamError = typeof req.query?.error === "string" ? req.query.error : "";
    const upstreamErrorDescription = typeof req.query?.error_description === "string" ? req.query.error_description : "";

    const redirectWithError = (errorCode, errorDescription) => {
        const safeDescription = typeof errorDescription === "string" && errorDescription.trim().length > 0
            ? errorDescription
            : "OAuth callback failed";

        res.setHeader("Set-Cookie", clearOAuthCookies(req));
        return sendRedirect(
            res,
            buildSiteUrl(req, "/", {
                error: errorCode,
                error_description: safeDescription,
            }),
        );
    };

    if (upstreamError) {
        logAuthDiagnostic("oauth_callback_upstream_error", req, {
            upstreamError,
            hasDescription: upstreamErrorDescription.length > 0,
        });

        return redirectWithError(upstreamError, upstreamErrorDescription || "OAuth provider returned an error");
    }

    if (!code || !state) {
        logAuthDiagnostic("oauth_callback_missing_code_or_state", req, {
            hasCode: Boolean(code),
            hasState: Boolean(state),
            hasOAuthState: Boolean(oauthState),
        });

        return redirectWithError("oauth_callback_missing_params", "Missing OAuth callback parameters");
    }

    const storedState = readOAuthStateFromRequest(req);
    const codeVerifier = readOAuthCodeVerifierFromRequest(req);

    if (!storedState || !codeVerifier) {
        logAuthDiagnostic("oauth_callback_missing_pkce_cookie", req, {
            hasStateCookie: Boolean(storedState),
            hasVerifierCookie: Boolean(codeVerifier),
        });

        return redirectWithError("oauth_pkce_cookie_missing", "OAuth verification cookie is missing");
    }

    if (!safeEqualStrings(state, storedState)) {
        logAuthDiagnostic("oauth_callback_state_mismatch", req, {
            stateLength: state.length,
            storedStateLength: storedState.length,
        });

        return redirectWithError("oauth_state_mismatch", "OAuth state validation failed");
    }

    try {
        const { response, data } = await exchangePkceCodeForSession(code, codeVerifier);

        if (!response.ok || !data?.refresh_token || !data?.access_token) {
            const message = extractAuthErrorMessage(data, "OAuth code exchange failed");
            logAuthDiagnostic("oauth_callback_exchange_failed", req, {
                status: response.status || 401,
                hasRefreshToken: Boolean(data?.refresh_token),
                hasAccessToken: Boolean(data?.access_token),
                reason: message,
            });

            return redirectWithError("oauth_exchange_failed", message);
        }

        res.setHeader("Set-Cookie", [
            buildRefreshCookie(data.refresh_token, req),
            ...clearOAuthCookies(req),
        ]);

        logAuthDiagnostic("oauth_callback_exchange_success", req, {
            status: 302,
            hasUser: Boolean(data?.user),
            expiresAt: data?.expires_at ?? null,
        });

        return sendRedirect(res, buildSiteUrl(req, "/"));
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected OAuth callback error";
        logAuthDiagnostic("oauth_callback_exception", req, {
            status: 500,
            reason: message,
        });

        return redirectWithError("oauth_callback_exception", message);
    }
}
