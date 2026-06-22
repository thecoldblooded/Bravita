import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}?lighthouse=true`;
const REPORT_DIR = path.resolve(ROOT, "_reports", "lighthouse");

function checkServer() {
    return new Promise((resolve) => {
        const req = http.get(URL, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on("error", () => {
            resolve(false);
        });
        req.end();
    });
}

async function waitForServer(timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await checkServer()) {
            return true;
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
}

function buildPlatformCommand(cmd, args) {
    if (process.platform === "win32") {
        return {
            command: "cmd.exe",
            commandArgs: ["/d", "/s", "/c", `${cmd} ${args.join(" ")}`]
        };
    }
    return {
        command: cmd,
        commandArgs: args
    };
}

async function runCommand(cmd, args, stdio = "inherit") {
    return new Promise((resolve, reject) => {
        const { command, commandArgs } = buildPlatformCommand(cmd, args);
        const child = spawn(command, commandArgs, {
            stdio,
            env: process.env
        });
        child.on("error", (err) => reject(err));
        child.on("close", (code) => resolve(code ?? 1));
    });
}

function loadEnv() {
    const envCandidates = [
        path.resolve(ROOT, ".env.local"),
        path.resolve(ROOT, ".env"),
    ];
    for (const envPath of envCandidates) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf8");
            for (const line of content.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const match = trimmed.match(/^(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/);
                if (match) {
                    let val = match[2].trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (process.env[match[1]] === undefined) {
                        process.env[match[1]] = val;
                    }
                }
            }
            break;
        }
    }
}

function checkBffHealth(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/healthz`, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed && parsed.ok === true && parsed.service === "bff-auth");
                } catch {
                    resolve(false);
                }
            });
        });
        req.on("error", () => resolve(false));
        req.end();
    });
}

async function waitForBff(port, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await checkBffHealth(port)) {
            return true;
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    return false;
}

async function main() {
    loadEnv();
    const bffPort = Number(process.env.BFF_AUTH_PORT || 3901);
    
    console.log(`Checking if BFF auth server is already running on port ${bffPort}...`);
    let isBffRunning = await checkBffHealth(bffPort);
    let bffProcess = null;

    if (!isBffRunning) {
        console.log(`Starting BFF auth server on port ${bffPort}...`);
        const { command: bffCmd, commandArgs: bffArgs } = buildPlatformCommand("node", ["scripts/bff/bff-auth-server.mjs"]);
        bffProcess = spawn(bffCmd, bffArgs, {
            stdio: "ignore",
            env: process.env
        });
        isBffRunning = await waitForBff(bffPort);
        if (!isBffRunning) {
            console.error("BFF auth server failed to start. Aborting.");
            if (bffProcess) bffProcess.kill("SIGTERM");
            process.exit(1);
        }
        console.log("BFF auth server started successfully.");
    } else {
        console.log("BFF auth server is already running.");
    }

    console.log("Starting production build before Lighthouse audit...");
    const buildCode = await runCommand("npm", ["run", "build"]);
    if (buildCode !== 0) {
        console.error("Build failed. Aborting Lighthouse audit.");
        if (bffProcess) bffProcess.kill("SIGTERM");
        process.exit(1);
    }

    console.log("Starting preview server...");
    const { command, commandArgs } = buildPlatformCommand("npx", [
        "vite",
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        String(PORT),
        "--strictPort"
    ]);
    const serverProcess = spawn(command, commandArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env
    });

    serverProcess.stderr.on("data", (data) => {
        console.error(`[Preview Server Error] ${data.toString()}`);
    });

    const isServerUp = await waitForServer();
    if (!isServerUp) {
        console.error("Preview server failed to start in time. Aborting.");
        serverProcess.kill("SIGTERM");
        if (bffProcess) bffProcess.kill("SIGTERM");
        process.exit(1);
    }

    console.log(`Preview server is up at ${URL}. Running Lighthouse audit...`);
    fs.mkdirSync(REPORT_DIR, { recursive: true });

    const reportFilePrefix = path.join(REPORT_DIR, "report");
    const lighthouseArgs = [
        "lighthouse",
        URL,
        "--output=json,html",
        `--output-path=${reportFilePrefix}`,
        "--throttling-method=provided",
        "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo"
    ];

    let lighthouseCode = 1;
    try {
        lighthouseCode = await runCommand("npx", lighthouseArgs, "inherit");
    } catch (err) {
        console.error("Failed to run Lighthouse command:", err);
    }

    // Stop servers
    serverProcess.kill("SIGTERM");
    if (bffProcess) bffProcess.kill("SIGTERM");

    const savedJsonPath = path.join(REPORT_DIR, "report.report.json");
    const savedHtmlPath = path.join(REPORT_DIR, "report.report.html");
    const finalJsonPath = path.join(REPORT_DIR, "report.json");
    const finalHtmlPath = path.join(REPORT_DIR, "report.html");

    if (fs.existsSync(savedJsonPath)) fs.renameSync(savedJsonPath, finalJsonPath);
    if (fs.existsSync(savedHtmlPath)) fs.renameSync(savedHtmlPath, finalHtmlPath);

    if (fs.existsSync(finalJsonPath)) {
        const report = JSON.parse(fs.readFileSync(finalJsonPath, "utf-8"));
        const categories = report.categories || {};
        
        const scores = {
            Performance: Math.round((categories.performance?.score || 0) * 100),
            Accessibility: Math.round((categories.accessibility?.score || 0) * 100),
            "Best Practices": Math.round((categories["best-practices"]?.score || 0) * 100),
            SEO: Math.round((categories.seo?.score || 0) * 100),
        };

        console.log("\n=================================");
        console.log("   LIGHTHOUSE AUDIT SCORES       ");
        console.log("=================================");
        for (const [name, score] of Object.entries(scores)) {
            let status = "🟢";
            if (score < 50) status = "🔴";
            else if (score < 80) status = "🟡";
            console.log(`${status} ${name.padEnd(16)}: ${score}/100`);
        }
        console.log("=================================\n");

        if (lighthouseCode !== 0) {
            console.warn(`⚠️ Lighthouse CLI exited with code ${lighthouseCode}, but a report was successfully generated.`);
        }

        const MIN_PERF_SCORE = 60;
        if (scores.Performance < MIN_PERF_SCORE) {
            console.error(`❌ Performance score ${scores.Performance} is below the minimum threshold of ${MIN_PERF_SCORE}.`);
            process.exit(1);
        }

        console.log("✅ Lighthouse audit passed threshold checks.");
        process.exit(0);
    } else {
        console.error("Lighthouse report was not found.");
        if (lighthouseCode !== 0) {
            console.error(`Lighthouse CLI failed with exit code: ${lighthouseCode}`);
            process.exit(lighthouseCode);
        }
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Lighthouse script error:", err);
    process.exit(1);
});
