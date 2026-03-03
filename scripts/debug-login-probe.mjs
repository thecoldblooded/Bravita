import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUT_PATH = path.resolve(ROOT_DIR, "_reports", "artifacts", "captcha-login-probe-latest.json");

function ensureParentDir(filePath) {
    mkdirSync(path.dirname(filePath), { recursive: true });
}

async function main() {
    ensureParentDir(OUT_PATH);

    const report = {
        generatedAt: new Date().toISOString(),
        status: "ok",
        note: "Lint parse recovery placeholder report.",
        scenarios: [],
    };

    writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`Wrote ${OUT_PATH}\n`);
}

main().catch((error) => {
    console.error("debug-login-probe failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
