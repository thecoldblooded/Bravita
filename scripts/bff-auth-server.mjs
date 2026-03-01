import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
import oauthGoogleStartHandler from "../api/auth/oauth/google/start.js";
import oauthCallbackHandler from "../api/auth/oauth/callback.js";

function loadEnvFileOnce(filePath) {
    if (!existsSync(filePath)) {
        return false;
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/u);

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const envLine = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
        const separatorIndex = envLine.indexOf("=");
        if (separatorIndex <= 0) {
            continue;
        }

        const key = envLine.slice(0, separatorIndex).trim();
        if (!key || process.env[key] !== undefined) {
            continue;
        }

        let value = envLine.slice(separatorIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }

    return true;
}

const localEnvCandidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
];

for (const envPath of localEnvCandidates) {
    if (loadEnvFileOnce(envPath)) {
        break;
    }
}

if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

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
    ["/api/auth/oauth/google/start", oauthGoogleStartHandler],
    ["/api/auth/oauth/callback", oauthCallbackHandler],
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

function toExpressLikeQuery(searchParams) {
    const query = Object.create(null);

    for (const [key, value] of searchParams.entries()) {
        if (!Object.prototype.hasOwnProperty.call(query, key)) {
            query[key] = value;
            continue;
        }

        const existing = query[key];
        query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }

    return query;
}

const server = http.createServer(async (req, res) => {
    const response = attachExpressLikeHelpers(res);
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    req.path = requestUrl.pathname;
    req.query = toExpressLikeQuery(requestUrl.searchParams);

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
