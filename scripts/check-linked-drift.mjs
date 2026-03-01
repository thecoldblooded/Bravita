import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRIFT_SQL_PATH = path.resolve(ROOT, "drift.sql");
const DRIFT_ERR_PATH = path.resolve(ROOT, "drift.err");

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DRIFT_TIMEOUT_MS = parsePositiveInt(process.env.SUPABASE_DRIFT_TIMEOUT_MS, 7 * 60 * 1000);
const DRIFT_HEARTBEAT_MS = 30 * 1000;
const DRIFT_KILL_GRACE_MS = 30 * 1000;

function nowIso() {
    return new Date().toISOString();
}

function logWithTimestamp(message) {
    console.log(`[${nowIso()}] ${message}`);
}

function loadDbPasswordFromEnvFile() {
    try {
        const envPath = path.resolve(ROOT, ".env");
        if (!fs.existsSync(envPath)) {
            return;
        }

        const envFile = fs.readFileSync(envPath, "utf-8");
        const match = envFile.match(/^SUPABASE_DB_PASSWORD=(.+)$/m);
        if (match) {
            process.env.SUPABASE_DB_PASSWORD = match[1].trim().replace(/^["']|["']$/g, "");
            console.log("Loaded SUPABASE_DB_PASSWORD from .env");
        }
    } catch (error) {
        console.warn("Could not read .env file:", error);
    }
}

function ensureDbPassword() {
    const value = process.env.SUPABASE_DB_PASSWORD;
    if (!value || value.trim().length === 0) {
        console.error("SUPABASE_DB_PASSWORD is required in environment for non-interactive drift check.");
        process.exit(1);
    }
}

function buildCommand() {
    const args = [
        "supabase",
        "db",
        "diff",
        "--linked",
        "--use-migra",
        "--schema",
        "public"
    ];

    if (process.platform === "win32") {
        const escaped = args.join(" ");
        return {
            command: "cmd.exe",
            commandArgs: ["/d", "/s", "/c", `npx ${escaped}`]
        };
    }

    return {
        command: "npx",
        commandArgs: args
    };
}

function runSupabaseDiff() {
    return new Promise((resolve, reject) => {
        const { command, commandArgs } = buildCommand();

        const child = spawn(command, commandArgs, {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD
            }
        });

        const stdoutChunks = [];
        const stderrChunks = [];
        const startedAt = Date.now();
        let timedOut = false;

        const heartbeatTimer = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
            logWithTimestamp(`supabase db diff still running (elapsed=${elapsedSeconds}s)`);
        }, DRIFT_HEARTBEAT_MS);
        heartbeatTimer.unref();

        const timeoutTimer = setTimeout(() => {
            timedOut = true;
            const timeoutSeconds = Math.floor(DRIFT_TIMEOUT_MS / 1000);
            console.error(`supabase db diff timed out after ${timeoutSeconds}s; sending SIGTERM...`);

            try {
                child.kill("SIGTERM");
            } catch {
                // no-op
            }

            setTimeout(() => {
                if (child.exitCode === null && child.signalCode === null) {
                    console.error("supabase db diff did not terminate after SIGTERM; sending SIGKILL...");
                    try {
                        child.kill("SIGKILL");
                    } catch {
                        // no-op
                    }
                }
            }, DRIFT_KILL_GRACE_MS).unref();
        }, DRIFT_TIMEOUT_MS);
        timeoutTimer.unref();

        child.stdout.on("data", (chunk) => {
            stdoutChunks.push(Buffer.from(chunk));
        });

        child.stderr.on("data", (chunk) => {
            stderrChunks.push(Buffer.from(chunk));
        });

        child.on("error", (error) => {
            clearInterval(heartbeatTimer);
            clearTimeout(timeoutTimer);
            reject(error);
        });

        child.on("close", (code) => {
            clearInterval(heartbeatTimer);
            clearTimeout(timeoutTimer);

            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            const stderr = Buffer.concat(stderrChunks).toString("utf8");
            const elapsedMs = Date.now() - startedAt;

            fs.writeFileSync(DRIFT_SQL_PATH, stdout, "utf8");
            fs.writeFileSync(DRIFT_ERR_PATH, stderr, "utf8");

            resolve({
                exitCode: typeof code === "number" ? code : 1,
                stdout,
                stderr,
                timedOut,
                elapsedMs
            });
        });
    });
}

function printDiagnostics(stdout, stderr) {
    const sqlBytes = Buffer.byteLength(stdout, "utf8");
    const errBytes = Buffer.byteLength(stderr, "utf8");

    console.log(`drift.sql size(bytes): ${sqlBytes}`);
    console.log(`drift.err size(bytes): ${errBytes}`);

    console.log("--- drift.err (last 80 lines) ---");
    const errLines = stderr.split(/\r?\n/);
    const errTail = errLines.slice(Math.max(0, errLines.length - 80)).join("\n");
    console.log(errTail);

    if (stdout.trim().length > 0) {
        console.log("--- drift.sql (first 120 lines) ---");
        const sqlHead = stdout.split(/\r?\n/).slice(0, 120).join("\n");
        console.log(sqlHead);
    }
}

function hasExecutableDriftSql(sqlText) {
    const cleaned = sqlText
        .split(/\r?\n/)
        .filter((line) => {
            const t = line.trim();
            return t.length > 0 && !t.startsWith("--");
        })
        .join("\n");

    if (cleaned.length === 0) {
        return false;
    }

    return /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(cleaned);
}

async function main() {
    loadDbPasswordFromEnvFile();
    ensureDbPassword();

    const timeoutSeconds = Math.floor(DRIFT_TIMEOUT_MS / 1000);
    logWithTimestamp(`Starting linked drift check with timeout=${timeoutSeconds}s`);

    const { exitCode, stdout, stderr, timedOut, elapsedMs } = await runSupabaseDiff();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    logWithTimestamp(`supabase db diff completed (elapsed=${elapsedSeconds}s, exitCode=${exitCode}, timedOut=${timedOut})`);

    printDiagnostics(stdout, stderr);

    if (timedOut) {
        console.error(`supabase db diff timed out after ${timeoutSeconds}s`);
        process.exit(124);
    }

    if (exitCode !== 0) {
        console.error(`supabase db diff failed with exit code ${exitCode}`);
        process.exit(exitCode);
    }

    if (hasExecutableDriftSql(stdout)) {
        console.error("❌ Database drift detected in public schema. Please create a migration for manual changes.");
        process.exit(1);
    }

    console.log("✅ No database drift detected in public schema.");
}

main().catch((error) => {
    console.error("Failed to run linked drift check:", error);
    process.exit(1);
});
