import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHECKLIST_PATH = path.resolve(ROOT, ".agent/scripts/checklist.py");

function candidateCommands() {
    if (process.platform === "win32") {
        return [
            { command: "py", args: ["-3.10", CHECKLIST_PATH, "."] },
            { command: "py", args: ["-3", CHECKLIST_PATH, "."] },
            { command: "python", args: [CHECKLIST_PATH, "."] },
            { command: "python3", args: [CHECKLIST_PATH, "."] }
        ];
    }

    return [
        { command: "python3", args: [CHECKLIST_PATH, "."] },
        { command: "python", args: [CHECKLIST_PATH, "."] }
    ];
}

function run(command, args) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: "inherit" });

        child.on("error", (error) => {
            if (error.code === "ENOENT") {
                resolve({ found: false, code: 1 });
                return;
            }

            console.error("Security checklist failed to start:", error);
            resolve({ found: true, code: 1 });
        });

        child.on("exit", (code) => resolve({ found: true, code: code ?? 1 }));
    });
}

async function main() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`Security checklist not found: ${CHECKLIST_PATH}`);
        process.exit(1);
    }

    for (const candidate of candidateCommands()) {
        const result = await run(candidate.command, candidate.args);
        if (!result.found) continue;
        process.exit(result.code);
    }

    console.error("Python is required to run the security checklist.");
    process.exit(1);
}

main();
