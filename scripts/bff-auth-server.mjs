import http from "node:http";
import { URL } from "node:url";

import captchaDiagnosticHandler from "../api/auth/captcha-diagnostic.js";
import loginHandler from "../api/auth/login.js";
import logoutHandler from "../api/auth/logout.js";
import recoverHandler from "../api/auth/recover.js";
import refreshHandler from "../api/auth/refresh.js";
import resendHandler from "../api/auth/resend.js";
import sessionHandler from "../api/auth/session.js";
import signupHandler from "../api/auth/signup.js";
import setSessionHandler from "../api/auth/set-session.js";

const MAX_BODY_BYTES = Number(process.env.BFF_MAX_BODY_BYTES || 1024 * 1024);

const routeHandlers = new Map([
    ["/api/auth/captcha-diagnostic", captchaDiagnosticHandler],
    ["/api/auth/login", loginHandler],
    ["/api/auth/logout", logoutHandler],
    ["/api/auth/recover", recoverHandler],
    ["/api/auth/refresh", refreshHandler],
    ["/api/auth/resend", resendHandler],
    ["/api/auth/session", sessionHandler],
    ["/api/auth/signup", signupHandler],
    ["/api/auth/set-session", setSessionHandler],
]);

function attachExpressLikeHelpers(res) {
    res.status = function status(code) {
        res.statusCode = code;
        return res;
    };

    res.json = function json(payload) {
        if (!res.getHeader("Content-Type")) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
        }

        res.end(JSON.stringify(payload));
        return res;
    };

    return res;
}

async function readBody(req) {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
        return undefined;
    }

    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;

        req.on("data", (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_BODY_BYTES) {
                reject(new Error("Payload too large"));
                req.destroy();
                return;
            }

            chunks.push(chunk);
        });

        req.on("end", () => {
            if (chunks.length === 0) {
                resolve(undefined);
                return;
            }

            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw) {
                resolve(undefined);
                return;
            }

            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(raw);
            }
        });

        req.on("error", reject);
    });
}

const server = http.createServer(async (req, res) => {
    const response = attachExpressLikeHelpers(res);
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (requestUrl.pathname === "/healthz") {
        return response.status(200).json({ ok: true, service: "bff-auth" });
    }

    const handler = routeHandlers.get(requestUrl.pathname);
    if (!handler) {
        return response.status(404).json({ error: "Not found" });
    }

    try {
        req.body = await readBody(req);
    } catch (error) {
        return response.status(413).json({
            error: error instanceof Error ? error.message : "Payload too large",
        });
    }

    try {
        await handler(req, response);
    } catch (error) {
        if (!response.headersSent) {
            return response.status(500).json({
                error: error instanceof Error ? error.message : "Unexpected BFF runtime error",
            });
        }
    }

    return undefined;
});

const port = Number(process.env.BFF_AUTH_PORT || 3901);
const host = process.env.BFF_AUTH_HOST || "127.0.0.1";

server.listen(port, host, () => {
    // Keep startup log for service managers and health checks.
    console.log(`[bff-auth] listening on http://${host}:${port}`);
});

function shutdown(signal) {
    console.log(`[bff-auth] received ${signal}, shutting down`);
    server.close(() => {
        process.exit(0);
    });

    setTimeout(() => {
        process.exit(1);
    }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
