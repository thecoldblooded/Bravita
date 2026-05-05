const COUNTER_API_BASE_URL = "https://api.counterapi.dev/v2";
const DEFAULT_COUNTER_WORKSPACE = "umuts-team-4010";
const DEFAULT_COUNTER_NAME = "first-counter-4010";
const INTERNAL_ERROR_MESSAGE = "Visitor counter is temporarily unavailable";
const MAX_BODY_BYTES = 1024;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const DEFAULT_COUNTER_TIMEOUT_MS = 5000;

const rateLimitStore = new Map();

function normalizeHeaderValue(value) {
    if (Array.isArray(value)) {
        return value[0] || "";
    }

    return typeof value === "string" ? value : "";
}

function sendJson(res, statusCode, payload) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    if (typeof res.status === "function" && typeof res.json === "function") {
        return res.status(statusCode).json(payload);
    }

    res.statusCode = statusCode;
    res.end(JSON.stringify(payload));
    return undefined;
}

function normalizeOrigin(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return null;
    }

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

function getRequestOrigin(req) {
    const forwardedProtocol = normalizeHeaderValue(req.headers["x-forwarded-proto"]).split(",")[0].trim();
    const protocol = forwardedProtocol || (req.socket?.encrypted ? "https" : "http");
    const forwardedHost = normalizeHeaderValue(req.headers["x-forwarded-host"]).split(",")[0].trim();
    const host = forwardedHost || normalizeHeaderValue(req.headers.host).split(",")[0].trim();

    if (!host) {
        return null;
    }

    return normalizeOrigin(`${protocol}://${host}`);
}

function getAllowedOrigins(req) {
    const configuredOrigins = String(
        process.env.COUNTERAPI_ALLOWED_ORIGINS
        || process.env.COUNTER_ALLOWED_ORIGINS
        || "",
    )
        .split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean);

    const environmentOrigins = [
        normalizeOrigin(process.env.SITE_URL),
        normalizeOrigin(process.env.VITE_SITE_URL),
        getRequestOrigin(req),
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ].filter(Boolean);

    return new Set([...configuredOrigins, ...environmentOrigins]);
}

function isAllowedOrigin(req) {
    const requestOrigin = normalizeOrigin(normalizeHeaderValue(req.headers.origin));
    if (!requestOrigin) {
        return true;
    }

    return getAllowedOrigins(req).has(requestOrigin);
}

function getClientIp(req) {
    const forwardedFor = normalizeHeaderValue(req.headers["x-forwarded-for"]).split(",")[0].trim();
    if (forwardedFor) {
        return forwardedFor;
    }

    const realIp = normalizeHeaderValue(req.headers["x-real-ip"]).trim();
    if (realIp) {
        return realIp;
    }

    return req.socket?.remoteAddress || "unknown";
}

function getPositiveInt(value, fallbackValue) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function cleanupRateLimitStore(now) {
    for (const [key, bucket] of rateLimitStore.entries()) {
        if (!bucket || bucket.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }

    if (rateLimitStore.size > 20_000) {
        rateLimitStore.clear();
    }
}

function consumeRateLimit(req) {
    const maxRequests = getPositiveInt(process.env.COUNTERAPI_RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS);
    if (maxRequests <= 0) {
        return { allowed: true };
    }

    const now = Date.now();
    const windowMs = getPositiveInt(process.env.COUNTERAPI_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);
    const key = `visitor-counter:${getClientIp(req)}`;
    cleanupRateLimitStore(now);

    const existing = rateLimitStore.get(key);
    const bucket = existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };

    if (bucket.count >= maxRequests) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
    }

    bucket.count += 1;
    rateLimitStore.set(key, bucket);

    return { allowed: true };
}

function parseJsonText(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

async function readRequestBody(req) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        return req.body;
    }

    if (typeof req.body === "string") {
        return parseJsonText(req.body);
    }

    if (Buffer.isBuffer(req.body)) {
        return parseJsonText(req.body.toString("utf8"));
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
            resolve(parseJsonText(Buffer.concat(chunks).toString("utf8")));
        });

        req.on("error", reject);
    });
}

function parseBoolean(value, fallbackValue) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }

    return fallbackValue;
}

function readCounterConfig() {
    const accessToken = String(
        process.env.COUNTERAPI_TOKEN
        || process.env.COUNTER_API_TOKEN
        || process.env.COUNTERAPI_API_KEY
        || "",
    ).trim();
    const workspace = String(
        process.env.COUNTERAPI_WORKSPACE
        || process.env.COUNTER_WORKSPACE
        || DEFAULT_COUNTER_WORKSPACE,
    ).trim();
    const counterName = String(
        process.env.COUNTERAPI_COUNTER_NAME
        || process.env.COUNTER_COUNTER_NAME
        || DEFAULT_COUNTER_NAME,
    ).trim();

    if (!accessToken) {
        return { error: "COUNTERAPI_TOKEN is not configured" };
    }

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(workspace)) {
        return { error: "COUNTERAPI_WORKSPACE must be a valid path segment" };
    }

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(counterName)) {
        return { error: "COUNTERAPI_COUNTER_NAME must be a valid path segment" };
    }

    return { accessToken, workspace, counterName };
}

async function fetchCounterApi(config, suffix) {
    const controller = new AbortController();
    const timeoutMs = getPositiveInt(process.env.COUNTERAPI_TIMEOUT_MS, DEFAULT_COUNTER_TIMEOUT_MS);
    const timeout = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    const basePath = `${encodeURIComponent(config.workspace)}/${encodeURIComponent(config.counterName)}`;
    const url = `${COUNTER_API_BASE_URL}/${basePath}${suffix}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${config.accessToken}`,
            },
            signal: controller.signal,
        });
        const text = await response.text();
        const payload = parseJsonText(text);

        if (!response.ok) {
            const error = new Error("CounterAPI request failed");
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    } finally {
        clearTimeout(timeout);
    }
}

function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toFiniteNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function firstFiniteNumber(values) {
    for (const value of values) {
        const parsed = toFiniteNumber(value);
        if (parsed !== null) {
            return Math.max(0, Math.trunc(parsed));
        }
    }

    return null;
}

function extractCounterValue(payload) {
    const root = asRecord(payload);
    const data = asRecord(root.data);
    const upCount = firstFiniteNumber([data.up_count, root.up_count]);
    const downCount = firstFiniteNumber([data.down_count, root.down_count]);
    const derivedValue = upCount !== null && downCount !== null ? upCount - downCount : upCount;

    return firstFiniteNumber([
        root.value,
        data.value,
        root.count,
        data.count,
        root.total,
        data.total,
        root.total_count,
        data.total_count,
        derivedValue,
    ]);
}

function extractTodayValue(payload) {
    const root = asRecord(payload);
    const data = asRecord(root.data);
    const stats = asRecord(data.stats || root.stats);
    const today = asRecord(stats.today || data.today || root.today);

    return firstFiniteNumber([
        today.up,
        today.count,
        today.value,
        data.today_count,
        root.today_count,
    ]);
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (!isAllowedOrigin(req)) {
        return sendJson(res, 403, { error: "Forbidden" });
    }

    const rateLimitResult = consumeRateLimit(req);
    if (!rateLimitResult.allowed) {
        res.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds));
        return sendJson(res, 429, { error: "Too many requests, please try again later." });
    }

    const config = readCounterConfig();
    if (config.error) {
        console.error("[visitor-counter] configuration_error", { reason: config.error });
        return sendJson(res, 503, { error: INTERNAL_ERROR_MESSAGE });
    }

    let body;
    try {
        body = await readRequestBody(req);
    } catch {
        return sendJson(res, 413, { error: "Payload too large" });
    }

    const shouldCountVisit = parseBoolean(body?.countVisit, true);

    try {
        const upPayload = shouldCountVisit ? await fetchCounterApi(config, "/up") : null;
        let statsPayload = null;

        try {
            statsPayload = await fetchCounterApi(config, "/stats");
        } catch (error) {
            if (!upPayload) {
                throw error;
            }
        }

        const total = extractCounterValue(statsPayload) ?? extractCounterValue(upPayload);
        const today = extractTodayValue(statsPayload);

        return sendJson(res, 200, {
            total,
            today,
            counted: shouldCountVisit,
        });
    } catch (error) {
        console.error("[visitor-counter] counterapi_error", {
            status: error?.status || null,
            message: error instanceof Error ? error.message : String(error),
        });
        return sendJson(res, 502, { error: INTERNAL_ERROR_MESSAGE });
    }
}
