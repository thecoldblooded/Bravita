import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRIFT_SQL_PATH = path.resolve(ROOT, "drift.sql");
const DRIFT_ERR_PATH = path.resolve(ROOT, "drift.err");

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

        child.stdout.on("data", (chunk) => {
            stdoutChunks.push(Buffer.from(chunk));
        });

        child.stderr.on("data", (chunk) => {
            stderrChunks.push(Buffer.from(chunk));
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            const stderr = Buffer.concat(stderrChunks).toString("utf8");

            fs.writeFileSync(DRIFT_SQL_PATH, stdout, "utf8");
            fs.writeFileSync(DRIFT_ERR_PATH, stderr, "utf8");

            resolve({
                exitCode: typeof code === "number" ? code : 1,
                stdout,
                stderr
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

    const { exitCode, stdout, stderr } = await runSupabaseDiff();
    printDiagnostics(stdout, stderr);

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
