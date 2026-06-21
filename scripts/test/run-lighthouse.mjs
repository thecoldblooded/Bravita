import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = 4173;
const URL = `http://localhost:${PORT}`;
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

async function main() {
    console.log("Starting production build before Lighthouse audit...");
    const buildCode = await runCommand("npm", ["run", "build"]);
    if (buildCode !== 0) {
        console.error("Build failed. Aborting Lighthouse audit.");
        process.exit(1);
    }

    console.log("Starting preview server...");
    const { command, commandArgs } = buildPlatformCommand("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"]);
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
        "--chrome-flags=--headless --no-sandbox --disable-gpu",
        "--only-categories=performance,accessibility,best-practices,seo"
    ];

    let lighthouseCode = 1;
    try {
        lighthouseCode = await runCommand("npx", lighthouseArgs, "inherit");
    } catch (err) {
        console.error("Failed to run Lighthouse command:", err);
    }

    // Stop preview server
    serverProcess.kill("SIGTERM");

    if (lighthouseCode !== 0) {
        console.error("Lighthouse audit process exited with error.");
        process.exit(lighthouseCode);
    }

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

        const MIN_PERF_SCORE = 60;
        if (scores.Performance < MIN_PERF_SCORE) {
            console.error(`❌ Performance score ${scores.Performance} is below the minimum threshold of ${MIN_PERF_SCORE}.`);
            process.exit(1);
        }

        console.log("✅ Lighthouse audit passed threshold checks.");
        process.exit(0);
    } else {
        console.error("Lighthouse report was not found.");
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Lighthouse script error:", err);
    process.exit(1);
});
