import {
    buildGoogleOAuthAuthorizeUrl,
    buildOAuthCodeVerifierCookie,
    buildOAuthStateCookie,
    generateOAuthPkcePair,
    logAuthDiagnostic,
    sendJson,
    sendRedirect,
} from "../../_shared.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        logAuthDiagnostic("oauth_google_start_method_not_allowed", req, {
            allow: "GET",
        });
        res.setHeader("Allow", "GET");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    try {
        const { verifier, challenge, state } = generateOAuthPkcePair();
        const authorizeUrl = buildGoogleOAuthAuthorizeUrl(req, state, challenge);

        res.setHeader("Set-Cookie", [
            buildOAuthStateCookie(state, req),
            buildOAuthCodeVerifierCookie(verifier, req),
        ]);

        logAuthDiagnostic("oauth_google_start_redirect", req, {
            authorizeHost: new URL(authorizeUrl).host,
            hasState: state.length > 0,
            hasCodeChallenge: challenge.length > 0,
        });

        return sendRedirect(res, authorizeUrl);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected OAuth start error";
        logAuthDiagnostic("oauth_google_start_exception", req, {
            status: 500,
            reason: message,
        });
        return sendJson(res, 500, { error: message });
    }
}
