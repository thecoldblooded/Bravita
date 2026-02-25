// @ts-nocheck
/// <reference path="./types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeTokenKey } from "../_shared/email-renderer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_MANAGEMENT_ACCESS_TOKEN = Deno.env.get("SUPABASE_MANAGEMENT_ACCESS_TOKEN") || Deno.env.get("SUPABASE_ACCESS_TOKEN");
const SUPABASE_PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") || deriveProjectRef(SUPABASE_URL);

const ALLOWED_ORIGINS = [
    "https://bravita.com.tr",
    "https://bravita.vervel.app",
    "https://www.bravita.com.tr",
    "http://localhost:8080",
];

const MAX_REQUEST_BYTES = 24 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MANAGEMENT_API_TIMEOUT_MS = 12_000;

const ALLOWED_SYNC_SLUGS = ["confirm_signup", "reset_password", "password_changed"] as const;
const ALLOWED_SYNC_SLUGS_SET = new Set(ALLOWED_SYNC_SLUGS);
const MANAGEMENT_API_ALLOWED_HOSTS = new Set(["api.supabase.com"]);

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._:-]{8,128}$/;
const TOKEN_REGEX = /\{\{\s*\.?\s*([A-Za-z0-9_]+)\s*\}\}/g;

const TOKEN_PLACEHOLDER_MAP: Record<string, string> = {
    CONFIRMATION_URL: "{{ .ConfirmationURL }}",
    SITE_URL: "{{ .SiteURL }}",
    EMAIL: "{{ .Email }}",
};

const TEMPLATE_MAPPING: Record<string, {
    subjectField: string;
    contentField: string;
    enableField?: string;
    requiredTokens: string[];
}> = {
    confirm_signup: {
        subjectField: "mailer_subjects_confirmation",
        contentField: "mailer_templates_confirmation_content",
        requiredTokens: ["CONFIRMATION_URL"],
    },
    reset_password: {
        subjectField: "mailer_subjects_recovery",
        contentField: "mailer_templates_recovery_content",
        requiredTokens: ["CONFIRMATION_URL"],
    },
    password_changed: {
        subjectField: "mailer_subjects_password_changed_notification",
        contentField: "mailer_templates_password_changed_notification_content",
        enableField: "mailer_notifications_password_changed_enabled",
        requiredTokens: ["EMAIL"],
    },
};

function deriveProjectRef(supabaseUrl: string | undefined): string | null {
    try {
        const parsed = new URL(String(supabaseUrl || ""));
        const host = parsed.hostname || "";
        const projectRef = host.split(".")[0]?.trim();
        return projectRef || null;
    } catch {
        return null;
    }
}

function isAllowedOrigin(origin: string): boolean {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    try {
        const parsed = new URL(origin);
        const hostname = parsed.hostname.toLowerCase();
        const protocol = parsed.protocol.toLowerCase();
        const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
        return isLocalhost && (protocol === "http:" || protocol === "https:");
    } catch {
        return false;
    }
}

function getCorsHeaders(req: Request) {
    const origin = req.headers.get("origin") || "";
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-jwt, x-idempotency-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
    };
}

function jsonResponse(req: Request, payload: unknown, status: number): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
        },
    });
}

function extractUserJwt(req: Request): string | null {
    const xUserJwt = req.headers.get("x-user-jwt");
    if (xUserJwt && xUserJwt.trim().length > 0) {
        return xUserJwt.replace(/^Bearer\s+/i, "").trim();
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.replace(/^Bearer\s+/i, "").trim();
    }

    return null;
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return null;
    return normalized;
}

function parseContentLength(req: Request): number {
    const raw = req.headers.get("content-length");
    if (!raw) return 0;

    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
}

function normalizeRequestedSlugs(rawSlugs: unknown): string[] {
    if (rawSlugs == null) {
        return [...ALLOWED_SYNC_SLUGS];
    }

    if (!Array.isArray(rawSlugs) || rawSlugs.length === 0) {
        throw httpError(400, "INVALID_SLUGS", "slugs must be a non-empty array when provided");
    }

    const normalized = Array.from(new Set(
        rawSlugs
            .map((slug) => String(slug || "").trim().toLowerCase())
            .filter(Boolean),
    ));

    if (normalized.length === 0) {
        throw httpError(400, "INVALID_SLUGS", "No valid slug received");
    }

    const invalid = normalized.filter((slug) => !ALLOWED_SYNC_SLUGS_SET.has(slug));
    if (invalid.length > 0) {
        throw httpError(400, "SLUG_NOT_ALLOWED", `Unsupported slug(s): ${invalid.join(", ")}`);
    }

    return normalized;
}

function normalizeDryRun(rawDryRun: unknown): boolean {
    if (rawDryRun == null) return false;
    if (typeof rawDryRun !== "boolean") {
        throw httpError(400, "INVALID_DRY_RUN", "dry_run must be boolean");
    }
    return rawDryRun;
}

function normalizeIdempotencyKey(rawKey: string | null): string {
    const key = String(rawKey || "").trim();
    if (!key) {
        throw httpError(400, "MISSING_IDEMPOTENCY_KEY", "x-idempotency-key header is required");
    }

    if (!IDEMPOTENCY_KEY_REGEX.test(key)) {
        throw httpError(400, "INVALID_IDEMPOTENCY_KEY", "x-idempotency-key format is invalid");
    }

    return key;
}

function sortForHash(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortForHash);
    }

    if (value && typeof value === "object") {
        const sorted: Record<string, unknown> = {};
        Object.keys(value as Record<string, unknown>)
            .sort()
            .forEach((key) => {
                sorted[key] = sortForHash((value as Record<string, unknown>)[key]);
            });
        return sorted;
    }

    return value;
}

function stableStringify(value: unknown): string {
    return JSON.stringify(sortForHash(value));
}

async function sha256Hex(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
        .map((item) => item.toString(16).padStart(2, "0"))
        .join("");
}

function convertTemplateTokens(content: string): {
    converted: string;
    usedTokens: string[];
    unsupportedTokens: string[];
} {
    const used = new Set<string>();
    const unsupported = new Set<string>();

    const converted = String(content || "").replace(TOKEN_REGEX, (_full, rawKey: string) => {
        const normalized = normalizeTokenKey(rawKey || "");
        if (!normalized) return "";

        used.add(normalized);
        const mapped = TOKEN_PLACEHOLDER_MAP[normalized];
        if (!mapped) {
            unsupported.add(normalized);
            return `{{${normalized}}}`;
        }

        return mapped;
    });

    return {
        converted,
        usedTokens: Array.from(used),
        unsupportedTokens: Array.from(unsupported),
    };
}

function buildPatchPayload(params: {
    requestedSlugs: string[];
    templatesBySlug: Map<string, { slug: string; subject: string; content_html: string; updated_at?: string | null }>;
}): {
    patchPayload: Record<string, unknown>;
    summary: Record<string, unknown>;
} {
    const { requestedSlugs, templatesBySlug } = params;
    const payload: Record<string, unknown> = {};
    const syncSummary: Array<Record<string, unknown>> = [];

    requestedSlugs.forEach((slug) => {
        const mapping = TEMPLATE_MAPPING[slug];
        const template = templatesBySlug.get(slug);

        if (!mapping || !template) {
            throw httpError(422, "TEMPLATE_NOT_FOUND", `Template not found for slug: ${slug}`);
        }

        const subjectRaw = String(template.subject || "").trim();
        const htmlRaw = String(template.content_html || "").trim();

        if (!subjectRaw || !htmlRaw) {
            throw httpError(422, "TEMPLATE_CONTENT_INVALID", `Template subject/content cannot be empty for slug: ${slug}`);
        }

        const convertedSubject = convertTemplateTokens(subjectRaw);
        const convertedHtml = convertTemplateTokens(htmlRaw);

        const unsupportedTokens = Array.from(new Set([
            ...convertedSubject.unsupportedTokens,
            ...convertedHtml.unsupportedTokens,
        ])).sort();

        if (unsupportedTokens.length > 0) {
            throw httpError(
                422,
                "UNSUPPORTED_TEMPLATE_TOKEN",
                `Unsupported token(s) for slug ${slug}: ${unsupportedTokens.join(", ")}`,
            );
        }

        const usedTokens = Array.from(new Set([
            ...convertedSubject.usedTokens,
            ...convertedHtml.usedTokens,
        ])).sort();

        const missingRequired = mapping.requiredTokens.filter((required) => !usedTokens.includes(required));
        if (missingRequired.length > 0) {
            throw httpError(
                422,
                "REQUIRED_TOKEN_MISSING",
                `Missing required token(s) for slug ${slug}: ${missingRequired.join(", ")}`,
            );
        }

        payload[mapping.subjectField] = convertedSubject.converted;
        payload[mapping.contentField] = convertedHtml.converted;

        if (mapping.enableField) {
            payload[mapping.enableField] = true;
        }

        syncSummary.push({
            slug,
            subject_field: mapping.subjectField,
            content_field: mapping.contentField,
            enable_field: mapping.enableField || null,
            required_tokens: mapping.requiredTokens,
            used_tokens: usedTokens,
            template_updated_at: template.updated_at || null,
        });
    });

    return {
        patchPayload: payload,
        summary: {
            synced_slugs: requestedSlugs,
            count: requestedSlugs.length,
            entries: syncSummary,
        },
    };
}

async function findIdempotencyRecord(params: {
    supabase: any;
    actorId: string;
    idempotencyKey: string;
}): Promise<{ id: string; payload_hash: string; response_status: number; response_body: unknown } | null> {
    const { supabase, actorId, idempotencyKey } = params;

    const { data, error } = await supabase
        .from("auth_template_sync_idempotency")
        .select("id, payload_hash, response_status, response_body")
        .eq("actor_id", actorId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (error) {
        throw httpError(500, "IDEMPOTENCY_LOOKUP_FAILED", "Failed to lookup idempotency record", {
            details: error.message,
        });
    }

    return data || null;
}

function buildReplayResponse(req: Request, existingRecord: {
    payload_hash: string;
    response_status: number;
    response_body: unknown;
}): Response {
    const replayStatus = Number(existingRecord.response_status || 200);

    if (replayStatus === 102) {
        return jsonResponse(req, {
            success: false,
            idempotent_replay: true,
            error: {
                code: "IDEMPOTENCY_IN_PROGRESS",
                message: "A request with the same idempotency key is still in progress",
            },
        }, 409);
    }

    const payload = (existingRecord.response_body && typeof existingRecord.response_body === "object")
        ? { ...(existingRecord.response_body as Record<string, unknown>) }
        : { success: replayStatus < 400 };

    return jsonResponse(req, {
        ...payload,
        idempotent_replay: true,
    }, replayStatus);
}

function assertPayloadHashOrThrow(existingRecord: { payload_hash: string }, incomingPayloadHash: string): void {
    if (existingRecord.payload_hash !== incomingPayloadHash) {
        throw httpError(409, "IDEMPOTENCY_PAYLOAD_CONFLICT", "Idempotency key already used with a different payload");
    }
}

async function enforceRateLimit(params: {
    supabase: any;
    actorId: string;
    actorEmail: string | null;
}): Promise<void> {
    const { supabase, actorId, actorEmail } = params;
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { data: recentAttempts, error: lookupError } = await supabase
        .from("integration_rate_limits")
        .select("id")
        .eq("integration_name", "auth_template_sync")
        .eq("action", "sync_auth_templates")
        .eq("actor_id", actorId)
        .gt("created_at", windowStart)
        .limit(RATE_LIMIT_MAX_REQUESTS);

    if (lookupError) {
        throw httpError(500, "RATE_LIMIT_LOOKUP_FAILED", "Rate limit lookup failed", {
            details: lookupError.message,
        });
    }

    if ((recentAttempts || []).length >= RATE_LIMIT_MAX_REQUESTS) {
        throw httpError(429, "RATE_LIMIT_EXCEEDED", "Too many sync requests, try again later");
    }

    const { error: insertRateLimitError } = await supabase
        .from("integration_rate_limits")
        .insert({
            integration_name: "auth_template_sync",
            action: "sync_auth_templates",
            actor_id: actorId,
            actor_email: actorEmail,
        });

    if (insertRateLimitError) {
        console.error("sync-auth-templates rate-limit insert failed:", sanitizeLogText(insertRateLimitError.message));
    }
}

function sanitizeLogText(message: unknown): string {
    const raw = String(message || "");

    return raw
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
        .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[REDACTED_JWT]")
        // Keep this callback block-form to avoid scanner false positives like `token: "..."` patterns.
        .replace(/[A-Za-z0-9]{24,}/g, (rawSegment) => {
            if (rawSegment.includes(" ")) {
                return rawSegment;
            }
            return "[REDACTED]";
        });
}

function managementApiUrl(projectRef: string): string {
    const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
    const parsed = new URL(url);

    if (!MANAGEMENT_API_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
        throw httpError(500, "MANAGEMENT_HOST_BLOCKED", "Management API host is not allowlisted");
    }

    return parsed.toString();
}

async function patchSupabaseAuthConfig(params: {
    projectRef: string;
    accessToken: string;
    payload: Record<string, unknown>;
}): Promise<{ status: number; body: unknown }> {
    const { projectRef, accessToken, payload } = params;
    const endpoint = managementApiUrl(projectRef);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MANAGEMENT_API_TIMEOUT_MS);

    try {
        const response = await fetch(endpoint, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        const text = await response.text();

        let parsedBody: unknown = {};
        if (text.trim().length > 0) {
            try {
                parsedBody = JSON.parse(text);
            } catch {
                parsedBody = { raw: text.slice(0, 500) };
            }
        }

        if (!response.ok) {
            throw httpError(502, "MANAGEMENT_API_ERROR", `Supabase Management API failed with status ${response.status}`, {
                upstream_status: response.status,
                upstream_body: parsedBody,
            });
        }

        return {
            status: response.status,
            body: parsedBody,
        };
    } catch (error) {
        if (error?.name === "AbortError") {
            throw httpError(504, "MANAGEMENT_API_TIMEOUT", "Supabase Management API timeout");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function writeAuditLog(params: {
    supabase: any;
    adminUserId: string;
    action: string;
    targetId?: string | null;
    details: Record<string, unknown>;
}): Promise<void> {
    const { supabase, adminUserId, action, targetId, details } = params;

    const { error } = await supabase
        .from("admin_audit_log")
        .insert({
            admin_user_id: adminUserId,
            action,
            target_table: "auth_template_sync",
            target_id: targetId || null,
            details,
        });

    if (error) {
        console.error("sync-auth-templates audit log write failed:", sanitizeLogText(error.message));
    }
}

function httpError(status: number, code: string, message: string, details?: unknown): Error {
    const error: any = new Error(message);
    error.status = status;
    error.code = code;
    error.details = details;
    return error;
}

function normalizeHttpError(error: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown;
} {
    const status = Number((error as any)?.status || 500);
    const code = String((error as any)?.code || "INTERNAL_ERROR");
    const message = String((error as any)?.message || "Internal server error");
    const details = (error as any)?.details ?? null;

    return {
        status: Number.isFinite(status) ? status : 500,
        code,
        message,
        details,
    };
}

async function claimIdempotencyRecord(params: {
    supabase: any;
    actorId: string;
    idempotencyKey: string;
    payloadHash: string;
    requestSummary: Record<string, unknown>;
}): Promise<{ rowId: string | null }> {
    const { supabase, actorId, idempotencyKey, payloadHash, requestSummary } = params;

    const { data, error } = await supabase
        .from("auth_template_sync_idempotency")
        .insert({
            actor_id: actorId,
            idempotency_key: idempotencyKey,
            payload_hash: payloadHash,
            response_status: 102,
            response_body: {
                success: false,
                error: {
                    code: "IDEMPOTENCY_IN_PROGRESS",
                    message: "Initial request still in progress",
                },
            },
            request_summary: requestSummary,
        })
        .select("id")
        .single();

    if (!error) {
        return {
            rowId: data?.id || null,
        };
    }

    if (error.code === "23505") {
        return { rowId: null };
    }

    throw httpError(500, "IDEMPOTENCY_CLAIM_FAILED", "Failed to claim idempotency key", {
        details: error.message,
    });
}

async function finalizeIdempotencyRecord(params: {
    supabase: any;
    rowId: string;
    status: number;
    body: Record<string, unknown>;
}): Promise<void> {
    const { supabase, rowId, status, body } = params;

    const { error } = await supabase
        .from("auth_template_sync_idempotency")
        .update({
            response_status: status,
            response_body: body,
        })
        .eq("id", rowId);

    if (error) {
        console.error("sync-auth-templates idempotency finalize failed:", sanitizeLogText(error.message));
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return jsonResponse(req, {
            success: false,
            error: {
                code: "METHOD_NOT_ALLOWED",
                message: "Method not allowed",
            },
        }, 405);
    }

    const requestId = crypto.randomUUID();

    let supabase: any = null;
    let actorId: string | null = null;
    let actorEmail: string | null = null;
    let idempotencyKey = "";
    let payloadHash = "";
    let requestedSlugs: string[] = [];
    let dryRun = false;
    let idempotencyRowId: string | null = null;

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_MANAGEMENT_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
            throw httpError(500, "SERVER_CONFIG_MISSING", "Missing required server configuration");
        }

        const contentLength = parseContentLength(req);
        if (contentLength > MAX_REQUEST_BYTES) {
            throw httpError(413, "PAYLOAD_TOO_LARGE", "Request payload is too large");
        }

        const rawBody = await req.text();
        const rawBodyBytes = new TextEncoder().encode(rawBody).byteLength;
        if (rawBodyBytes > MAX_REQUEST_BYTES) {
            throw httpError(413, "PAYLOAD_TOO_LARGE", "Request payload is too large");
        }

        let body: Record<string, unknown> = {};
        if (rawBody.trim().length > 0) {
            try {
                body = JSON.parse(rawBody);
            } catch {
                throw httpError(400, "INVALID_JSON", "Request body must be valid JSON");
            }
        }

        requestedSlugs = normalizeRequestedSlugs(body.slugs);
        dryRun = normalizeDryRun(body.dry_run);
        idempotencyKey = normalizeIdempotencyKey(req.headers.get("x-idempotency-key"));

        const token = extractUserJwt(req);
        if (!token) {
            throw httpError(401, "UNAUTHORIZED", "Missing auth token");
        }

        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            throw httpError(401, "UNAUTHORIZED", "Invalid auth token");
        }

        actorId = String(user.id);
        actorEmail = normalizeEmail(user.email);

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_superadmin")
            .eq("id", actorId)
            .maybeSingle();

        if (profileError) {
            throw httpError(500, "PROFILE_LOOKUP_FAILED", "Profile lookup failed");
        }

        if (!profile?.is_superadmin) {
            throw httpError(403, "FORBIDDEN", "Superadmin access required");
        }

        payloadHash = await sha256Hex(stableStringify({
            actor_id: actorId,
            slugs: requestedSlugs,
            dry_run: dryRun,
        }));

        const existingRecord = await findIdempotencyRecord({
            supabase,
            actorId,
            idempotencyKey,
        });

        if (existingRecord) {
            assertPayloadHashOrThrow(existingRecord, payloadHash);
            return buildReplayResponse(req, existingRecord);
        }

        await enforceRateLimit({
            supabase,
            actorId,
            actorEmail,
        });

        const claimResult = await claimIdempotencyRecord({
            supabase,
            actorId,
            idempotencyKey,
            payloadHash,
            requestSummary: {
                request_id: requestId,
                slugs: requestedSlugs,
                dry_run: dryRun,
            },
        });

        if (!claimResult.rowId) {
            const recordAfterConflict = await findIdempotencyRecord({
                supabase,
                actorId,
                idempotencyKey,
            });

            if (!recordAfterConflict) {
                throw httpError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key conflict");
            }

            assertPayloadHashOrThrow(recordAfterConflict, payloadHash);
            return buildReplayResponse(req, recordAfterConflict);
        }

        idempotencyRowId = claimResult.rowId;

        const { data: templates, error: templatesError } = await supabase
            .from("email_templates")
            .select("slug, subject, content_html, updated_at")
            .in("slug", requestedSlugs);

        if (templatesError) {
            throw httpError(500, "TEMPLATE_FETCH_FAILED", "Failed to fetch templates", {
                details: templatesError.message,
            });
        }

        const templatesBySlug = new Map(
            (templates || []).map((row: any) => [String(row.slug || "").toLowerCase(), row]),
        );

        const missingSlugs = requestedSlugs.filter((slug) => !templatesBySlug.has(slug));
        if (missingSlugs.length > 0) {
            throw httpError(422, "TEMPLATE_NOT_FOUND", `Missing template(s): ${missingSlugs.join(", ")}`);
        }

        const { patchPayload, summary } = buildPatchPayload({
            requestedSlugs,
            templatesBySlug,
        });

        const patchChecksum = await sha256Hex(stableStringify(patchPayload));

        if (dryRun) {
            const dryRunPayload = {
                success: true,
                dry_run: true,
                idempotent_replay: false,
                request_id: requestId,
                synced_slugs: requestedSlugs,
                payload_hash: payloadHash,
                patch_checksum: patchChecksum,
                summary,
                patch_preview: patchPayload,
            };

            await finalizeIdempotencyRecord({
                supabase,
                rowId: idempotencyRowId,
                status: 200,
                body: dryRunPayload,
            });

            await writeAuditLog({
                supabase,
                adminUserId: actorId,
                action: "sync_auth_templates_dry_run",
                targetId: idempotencyRowId,
                details: {
                    request_id: requestId,
                    actor_email: actorEmail,
                    slugs: requestedSlugs,
                    dry_run: true,
                    payload_hash: payloadHash,
                    patch_checksum: patchChecksum,
                    success: true,
                },
            });

            return jsonResponse(req, dryRunPayload, 200);
        }

        const managementResult = await patchSupabaseAuthConfig({
            projectRef: SUPABASE_PROJECT_REF,
            accessToken: SUPABASE_MANAGEMENT_ACCESS_TOKEN,
            payload: patchPayload,
        });

        const successPayload = {
            success: true,
            dry_run: false,
            idempotent_replay: false,
            request_id: requestId,
            synced_slugs: requestedSlugs,
            payload_hash: payloadHash,
            patch_checksum: patchChecksum,
            management_status: managementResult.status,
            summary,
        };

        await finalizeIdempotencyRecord({
            supabase,
            rowId: idempotencyRowId,
            status: 200,
            body: successPayload,
        });

        await writeAuditLog({
            supabase,
            adminUserId: actorId,
            action: "sync_auth_templates",
            targetId: idempotencyRowId,
            details: {
                request_id: requestId,
                actor_email: actorEmail,
                slugs: requestedSlugs,
                dry_run: false,
                payload_hash: payloadHash,
                patch_checksum: patchChecksum,
                management_status: managementResult.status,
                success: true,
            },
        });

        return jsonResponse(req, successPayload, 200);
    } catch (error: unknown) {
        const normalizedError = normalizeHttpError(error);

        console.error(
            "sync-auth-templates error:",
            normalizedError.code,
            sanitizeLogText(normalizedError.message),
        );

        const failPayload = {
            success: false,
            idempotent_replay: false,
            request_id: requestId,
            error: {
                code: normalizedError.code,
                message: normalizedError.status >= 500 ? "Internal server error" : normalizedError.message,
            },
        } as Record<string, unknown>;

        if (normalizedError.status < 500 && normalizedError.details) {
            failPayload.error_details = normalizedError.details;
        }

        if (supabase && idempotencyRowId) {
            await finalizeIdempotencyRecord({
                supabase,
                rowId: idempotencyRowId,
                status: normalizedError.status,
                body: failPayload,
            });
        }

        if (supabase && actorId) {
            await writeAuditLog({
                supabase,
                adminUserId: actorId,
                action: "sync_auth_templates_failed",
                targetId: idempotencyRowId,
                details: {
                    request_id: requestId,
                    actor_email: actorEmail,
                    slugs: requestedSlugs,
                    dry_run: dryRun,
                    payload_hash: payloadHash || null,
                    error_code: normalizedError.code,
                    error_status: normalizedError.status,
                    success: false,
                },
            });
        }

        return jsonResponse(req, failPayload, normalizedError.status);
    }
});
