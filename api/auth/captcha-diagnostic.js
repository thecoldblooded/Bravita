import { assertValidAuthPostRequest, logAuthDiagnostic, parseRequestBody, sendJson } from "./_shared.js";

const MAX_EVENT_LENGTH = 80;
const MAX_VALUE_LENGTH = 280;
const MAX_KEYS = 24;

function normalizeEvent(value) {
    if (typeof value !== "string") {
        return "unknown";
    }

    const cleaned = value.trim().slice(0, MAX_EVENT_LENGTH);
    return cleaned || "unknown";
}

function sanitizeValue(value) {
    if (value == null) return null;
    if (typeof value === "boolean" || typeof value === "number") return value;

    if (typeof value === "string") {
        return value.slice(0, MAX_VALUE_LENGTH);
    }

    try {
        return JSON.stringify(value).slice(0, MAX_VALUE_LENGTH);
    } catch {
        return String(value).slice(0, MAX_VALUE_LENGTH);
    }
}

function sanitizePayload(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return null;
    }

    const entries = Object.entries(input).slice(0, MAX_KEYS);
    const sanitized = {};

    for (const [key, value] of entries) {
        const normalizedKey = String(key).slice(0, 64);
        sanitized[normalizedKey] = sanitizeValue(value);
    }

    return sanitized;
}

export default function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Method not allowed" });
    }

    if (!assertValidAuthPostRequest(req, res)) {
        return;
    }

    const body = parseRequestBody(req);
    const event = normalizeEvent(body?.event);
    const payload = sanitizePayload(body?.payload);

    logAuthDiagnostic("captcha_client_diag", req, {
        diagEvent: event,
        diagPayload: payload,
    });

    return sendJson(res, 204, {});
}
