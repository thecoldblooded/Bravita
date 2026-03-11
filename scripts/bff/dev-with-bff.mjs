import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_BFF_TARGET = "http://127.0.0.1:3901";
const HEALTH_CHECK_PATH = "/healthz";
const HEALTH_CHECK_TIMEOUT_MS = 1_500;
const HEALTH_POLL_INTERVAL_MS = 350;
const BFF_STARTUP_TIMEOUT_MS = parsePositiveInt(process.env.BFF_DEV_BOOT_TIMEOUT_MS, 15_000);

let isShuttingDown = false;
let bffChild = null;
let viteChild = null;
let bffStartedByThisScript = false;

function parsePositiveInt(value, fallbackValue) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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

function loadLocalEnv() {
    const localEnvCandidates = [
        path.resolve(ROOT, ".env.local"),
        path.resolve(ROOT, ".env"),
    ];

    for (const envPath of localEnvCandidates) {
        if (loadEnvFileOnce(envPath)) {
            break;
        }
    }
}

function resolveBffOrigin() {
    const rawTarget = String(process.env.VITE_BFF_AUTH_TARGET || DEFAULT_BFF_TARGET).trim();

    try {
        const parsed = new URL(rawTarget);
        const protocol = parsed.protocol || "http:";
        const hostname = parsed.hostname || "127.0.0.1";
        const port = parsed.port || (protocol === "https:" ? "443" : "80");
        return `${protocol}//${hostname}:${port}`;
    } catch {
        return DEFAULT_BFF_TARGET;
    }
}

function buildNpmRunCommand(scriptName) {
    if (process.platform === "win32") {
        return {
            command: "cmd.exe",
            commandArgs: ["/d", "/s", "/c", `npm run ${scriptName}`],
        };
    }

    return {
        command: "npm",
        commandArgs: ["run", scriptName],
    };
}

async function isBffHealthy(healthUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, HEALTH_CHECK_TIMEOUT_MS);

    try {
        const response = await fetch(healthUrl, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return false;
        }

        const payload = await response.json().catch(() => null);
        return Boolean(payload && payload.ok === true && payload.service === "bff-auth");
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

async function waitForBffReady(healthUrl) {
    const deadline = Date.now() + BFF_STARTUP_TIMEOUT_MS;

    while (Date.now() < deadline) {
        if (await isBffHealthy(healthUrl)) {
            return true;
        }

        if (bffChild && bffChild.exitCode !== null) {
            return false;
        }

        await sleep(HEALTH_POLL_INTERVAL_MS);
    }

    return false;
}

function spawnChild(command, commandArgs, label) {
    const child = spawn(command, commandArgs, {
        stdio: "inherit",
        env: process.env,
    });

    child.on("error", (error) => {
        console.error(`[dev-with-bff] ${label} başlatılamadı:`, error);
        void shutdown(1);
    });

    return child;
}

function stopChild(child, signal = "SIGTERM") {
    if (!child || child.exitCode !== null) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const forceKillTimer = setTimeout(() => {
            if (child.exitCode === null) {
                try {
                    child.kill("SIGKILL");
                } catch {
                    // no-op
                }
            }
        }, 5_000);
        forceKillTimer.unref?.();

        child.once("exit", () => {
            clearTimeout(forceKillTimer);
            resolve();
        });

        try {
            child.kill(signal);
        } catch {
            clearTimeout(forceKillTimer);
            resolve();
        }
    });
}

async function ensureBff(healthUrl) {
    if (await isBffHealthy(healthUrl)) {
        console.log(`[dev-with-bff] BFF zaten aktif: ${healthUrl}`);
        return;
    }

    console.log("[dev-with-bff] BFF aktif değil, otomatik başlatılıyor...");

    const { command, commandArgs } = buildNpmRunCommand("bff:auth");
    bffChild = spawnChild(command, commandArgs, "bff:auth");
    bffStartedByThisScript = true;

    bffChild.on("exit", (code, signal) => {
        if (isShuttingDown) {
            return;
        }

        if (viteChild && viteChild.exitCode === null) {
            const signalText = signal ? `, signal=${signal}` : "";
            console.error(`[dev-with-bff] bff:auth beklenmedik şekilde kapandı (code=${code ?? "null"}${signalText}).`);
            void shutdown(1);
        }
    });

    const healthy = await waitForBffReady(healthUrl);
    if (!healthy) {
        throw new Error(`BFF ${BFF_STARTUP_TIMEOUT_MS}ms içinde hazır olmadı: ${healthUrl}`);
    }

    console.log(`[dev-with-bff] BFF hazır: ${healthUrl}`);
}

function startVite() {
    const { command, commandArgs } = buildNpmRunCommand("dev:vite");
    viteChild = spawnChild(command, commandArgs, "dev:vite");

    viteChild.on("exit", (code, signal) => {
        if (isShuttingDown) {
            return;
        }

        const exitCode = typeof code === "number" ? code : (signal ? 1 : 0);
        void shutdown(exitCode);
    });
}

async function shutdown(exitCode = 0) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    await stopChild(viteChild);

    if (bffStartedByThisScript) {
        await stopChild(bffChild);
    }

    process.exit(exitCode);
}

async function main() {
    loadLocalEnv();

    const bffOrigin = resolveBffOrigin();
    const healthUrl = new URL(HEALTH_CHECK_PATH, `${bffOrigin}/`).toString();

    console.log(`[dev-with-bff] BFF target: ${bffOrigin}`);

    await ensureBff(healthUrl);
    startVite();
}

process.on("SIGINT", () => {
    void shutdown(0);
});

process.on("SIGTERM", () => {
    void shutdown(0);
});

main().catch((error) => {
    console.error("[dev-with-bff] Başlatma hatası:", error instanceof Error ? error.message : String(error));
    void shutdown(1);
});
