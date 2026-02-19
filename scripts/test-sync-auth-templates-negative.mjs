import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    const env = {};

    for (const rawLine of lines) {
        const line = String(rawLine || "").trim();
        if (!line || line.startsWith("#")) continue;

        const idx = line.indexOf("=");
        if (idx <= 0) continue;

        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        env[key] = value;
    }

    return env;
}

function getNowTag() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

function resolveConfig() {
    const merged = {
        ...loadEnvFile(path.resolve(".env")),
        ...loadEnvFile(path.resolve(".env.local")),
        ...process.env,
    };

    const supabaseUrl =
        merged.VITE_SUPABASE_URL ||
        merged.SUPABASE_URL ||
        "";

    const anonKey =
        merged.VITE_SUPABASE_ANON_KEY ||
        merged.SUPABASE_ANON_KEY ||
        "";

    if (!supabaseUrl) {
        throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL");
    }

    const normalizedUrl = String(supabaseUrl).replace(/\/+$/, "");
    const endpoint = `${normalizedUrl}/functions/v1/sync-auth-templates`;

    return {
        endpoint,
        anonKey,
        hasAnonKey: anonKey.length > 0,
    };
}

function extractErrorCode(payload) {
    if (!payload || typeof payload !== "object") return null;
    const maybeError = payload.error;
    if (maybeError && typeof maybeError === "object" && "code" in maybeError) {
        return String(maybeError.code || "") || null;
    }
    return null;
}

function makeLargePayload() {
    const hugeHtml = "A".repeat(30 * 1024);
    return JSON.stringify({
        slugs: ["confirm_signup"],
        dry_run: false,
        oversized: hugeHtml,
    });
}

async function run() {
    const { endpoint, anonKey, hasAnonKey } = resolveConfig();

    const largeBody = makeLargePayload();

    const cases = [
        {
            id: "NEG-01",
            name: "GET method should be rejected",
            method: "GET",
            headers: {},
            expectedStatus: 405,
            expectedCode: "METHOD_NOT_ALLOWED",
        },
        {
            id: "NEG-02",
            name: "Invalid JSON body",
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: "{invalid_json",
            expectedStatus: 400,
            expectedCode: "INVALID_JSON",
        },
        {
            id: "NEG-03",
            name: "Missing idempotency key",
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({}),
            expectedStatus: 400,
            expectedCode: "MISSING_IDEMPOTENCY_KEY",
        },
        {
            id: "NEG-04",
            name: "Invalid idempotency key format",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "short",
            },
            body: JSON.stringify({}),
            expectedStatus: 400,
            expectedCode: "INVALID_IDEMPOTENCY_KEY",
        },
        {
            id: "NEG-05",
            name: "Invalid dry_run type",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg05-valid-idempotency-key",
            },
            body: JSON.stringify({ dry_run: "true" }),
            expectedStatus: 400,
            expectedCode: "INVALID_DRY_RUN",
        },
        {
            id: "NEG-06",
            name: "Invalid slugs shape",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg06-valid-idempotency-key",
            },
            body: JSON.stringify({ slugs: "confirm_signup" }),
            expectedStatus: 400,
            expectedCode: "INVALID_SLUGS",
        },
        {
            id: "NEG-07",
            name: "Slug not allowed",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg07-valid-idempotency-key",
            },
            body: JSON.stringify({ slugs: ["not_allowed_slug"] }),
            expectedStatus: 400,
            expectedCode: "SLUG_NOT_ALLOWED",
        },
        {
            id: "NEG-08",
            name: "Missing auth token after validation pass",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg08-valid-idempotency-key",
            },
            body: JSON.stringify({ slugs: ["confirm_signup"], dry_run: true }),
            expectedStatus: 401,
            expectedCode: "UNAUTHORIZED",
        },
        {
            id: "NEG-09",
            name: "Invalid auth token (anon key)",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg09-valid-idempotency-key",
                ...(hasAnonKey
                    ? {
                        authorization: `Bearer ${anonKey}`,
                        apikey: anonKey,
                    }
                    : {}),
            },
            body: JSON.stringify({ slugs: ["confirm_signup"], dry_run: true }),
            expectedStatus: hasAnonKey ? 401 : -1,
            expectedCode: hasAnonKey ? "UNAUTHORIZED" : null,
            skipped: !hasAnonKey,
            skipReason: hasAnonKey ? null : "Anon key not found in env",
        },
        {
            id: "NEG-10",
            name: "Payload too large",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-idempotency-key": "neg10-valid-idempotency-key",
            },
            body: largeBody,
            expectedStatus: 413,
            expectedCode: "PAYLOAD_TOO_LARGE",
        },
        {
            id: "NEG-11",
            name: "OPTIONS preflight should be accepted",
            method: "OPTIONS",
            headers: {
                origin: "http://localhost:5173",
                "access-control-request-method": "POST",
            },
            expectedStatus: 200,
            expectedCode: null,
        },
    ];

    const results = [];

    for (const c of cases) {
        if (c.skipped) {
            results.push({
                id: c.id,
                name: c.name,
                skipped: true,
                skip_reason: c.skipReason || "Skipped",
            });
            continue;
        }

        const startedAt = new Date().toISOString();

        try {
            const response = await fetch(endpoint, {
                method: c.method,
                headers: c.headers,
                body: c.body,
            });

            const rawText = await response.text();
            let parsedBody = null;
            try {
                parsedBody = rawText ? JSON.parse(rawText) : null;
            } catch {
                parsedBody = null;
            }

            const actualCode = extractErrorCode(parsedBody);
            const statusMatches = response.status === c.expectedStatus;
            const codeMatches = c.expectedCode == null ? true : actualCode === c.expectedCode;

            results.push({
                id: c.id,
                name: c.name,
                skipped: false,
                request: {
                    method: c.method,
                    has_auth_header: Boolean(c.headers.authorization),
                    has_idempotency_key: Boolean(c.headers["x-idempotency-key"]),
                    content_type: c.headers["content-type"] || null,
                    body_bytes: c.body ? Buffer.byteLength(c.body, "utf8") : 0,
                },
                expected: {
                    status: c.expectedStatus,
                    error_code: c.expectedCode,
                },
                actual: {
                    status: response.status,
                    error_code: actualCode,
                    access_control_allow_origin: response.headers.get("access-control-allow-origin"),
                    body_preview: rawText.slice(0, 500),
                },
                passed: statusMatches && codeMatches,
                started_at: startedAt,
                finished_at: new Date().toISOString(),
            });
        } catch (error) {
            results.push({
                id: c.id,
                name: c.name,
                skipped: false,
                expected: {
                    status: c.expectedStatus,
                    error_code: c.expectedCode,
                },
                actual: {
                    network_error: String(error?.message || error),
                },
                passed: false,
                started_at: startedAt,
                finished_at: new Date().toISOString(),
            });
        }
    }

    const total = results.filter((r) => !r.skipped).length;
    const passed = results.filter((r) => !r.skipped && r.passed).length;
    const failed = results.filter((r) => !r.skipped && !r.passed).length;
    const skipped = results.filter((r) => r.skipped).length;

    const output = {
        generated_at: new Date().toISOString(),
        endpoint,
        summary: {
            total,
            passed,
            failed,
            skipped,
        },
        results,
    };

    fs.mkdirSync(path.resolve("artifacts"), { recursive: true });

    const stampedPath = path.resolve("artifacts", `sync-auth-templates-negative-${getNowTag()}.json`);
    const latestPath = path.resolve("artifacts", "sync-auth-templates-negative-latest.json");

    fs.writeFileSync(stampedPath, JSON.stringify(output, null, 2), "utf8");
    fs.writeFileSync(latestPath, JSON.stringify(output, null, 2), "utf8");

    console.log(`Endpoint: ${endpoint}`);
    console.log(`Summary: total=${total}, passed=${passed}, failed=${failed}, skipped=${skipped}`);
    console.log(`Stamped artifact: ${stampedPath}`);
    console.log(`Latest artifact: ${latestPath}`);

    for (const r of results) {
        if (r.skipped) {
            console.log(`${r.id} SKIPPED - ${r.name} (${r.skip_reason})`);
            continue;
        }

        const statusPart = r.actual?.status != null ? `status=${r.actual.status}` : "status=n/a";
        const codePart = r.actual?.error_code ? `code=${r.actual.error_code}` : "code=n/a";
        const verdict = r.passed ? "PASS" : "FAIL";
        console.log(`${r.id} ${verdict} - ${r.name} (${statusPart}, ${codePart})`);
    }

    if (failed > 0) {
        process.exitCode = 1;
    }
}

run().catch((error) => {
    console.error("Test runner fatal error:", error?.message || error);
    process.exit(1);
});
