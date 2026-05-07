import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadSocketTokenFromEnvFile() {
    try {
        const envPath = path.resolve(ROOT, ".env");
        if (!fs.existsSync(envPath)) {
            return;
        }

        const envFile = fs.readFileSync(envPath, "utf-8");
        const match = envFile.match(/^SOCKET_CLI_API_TOKEN=(.+)$/m);
        if (match) {
            process.env.SOCKET_CLI_API_TOKEN = match[1]
                .trim()
                .replace(/^["']|["']$/g, "");
            console.log("Loaded SOCKET_CLI_API_TOKEN from .env");
        }
    } catch (error) {
        console.warn("Could not read .env file:", error);
    }
}

function ensureSocketToken() {
    const value = process.env.SOCKET_CLI_API_TOKEN;
    if (!value || value.trim().length === 0) {
        console.error("SOCKET_CLI_API_TOKEN is required for Socket CI scan.");
        process.exit(1);
    }
}

function buildCommand() {
    const args = [
        "@socketsecurity/cli@latest",
        "ci",
        ".",
        "--json",
        "--no-banner",
        "--no-spinner",
        "--reach-analysis-timeout", "300"
    ];

    if (process.platform === "win32") {
        return {
            command: "cmd.exe",
            commandArgs: ["/d", "/s", "/c", `npx ${args.join(" ")}`]
        };
    }

    return {
        command: "npx",
        commandArgs: args
    };
}

function runSocketCi() {
    return new Promise((resolve, reject) => {
        const { command, commandArgs } = buildCommand();
        let output = "";

        const appendOutput = (chunk, stream) => {
            const text = chunk.toString();
            stream.write(text);
            output = `${output}${text}`.slice(-20_000);
        };

        const child = spawn(command, commandArgs, {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                SOCKET_CLI_API_TOKEN: process.env.SOCKET_CLI_API_TOKEN,
                SOCKET_CLI_API_TIMEOUT: process.env.SOCKET_CLI_API_TIMEOUT || "300000"
            }
        });

        child.stdout.on("data", (chunk) => appendOutput(chunk, process.stdout));
        child.stderr.on("data", (chunk) => appendOutput(chunk, process.stderr));
        child.on("error", (error) => reject(error));
        child.on("exit", (code) => resolve({ code: code ?? 1, output }));
    });
}

async function runSocketCiWithRetries() {
    const maxAttempts = Number.parseInt(process.env.SOCKET_CI_ATTEMPTS || "2", 10);
    const attempts = Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 2;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const { code: exitCode, output } = await runSocketCi();
        if (exitCode === 0 || attempt === attempts) {
            const allowApiFailure = process.env.SOCKET_CI_ALLOW_API_FAILURE !== "false";
            const apiFailure = /API request failed|Unexpected error reading response text/i.test(output);
            if (exitCode !== 0 && allowApiFailure && apiFailure) {
                console.warn("Socket CI scan ended with a Socket API response error after retries; continuing because SOCKET_CI_ALLOW_API_FAILURE is not false.");
                return 0;
            }

            return exitCode;
        }

        console.warn(`Socket CI scan failed with exit code ${exitCode}; retrying (${attempt + 1}/${attempts})...`);
    }

    return 1;
}

async function main() {
    loadSocketTokenFromEnvFile();
    ensureSocketToken();

    const exitCode = await runSocketCiWithRetries();
    process.exit(exitCode);
}

main().catch((error) => {
    console.error("Socket CI scan failed:", error);
    process.exit(1);
});
