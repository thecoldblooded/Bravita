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
        "--no-spinner"
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

        const child = spawn(command, commandArgs, {
            stdio: "inherit",
            env: {
                ...process.env,
                SOCKET_CLI_API_TOKEN: process.env.SOCKET_CLI_API_TOKEN
            }
        });

        child.on("error", (error) => reject(error));
        child.on("exit", (code) => resolve(code ?? 1));
    });
}

async function main() {
    loadSocketTokenFromEnvFile();
    ensureSocketToken();

    const exitCode = await runSocketCi();
    process.exit(exitCode);
}

main().catch((error) => {
    console.error("Socket CI scan failed:", error);
    process.exit(1);
});
