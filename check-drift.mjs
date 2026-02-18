import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

async function runSupabaseDrift() {
    return new Promise((resolve) => {
        const command = process.platform === "win32" ? "cmd.exe" : "npx";
        const args = ["supabase", "db", "diff", "--use-migra", "--schema", "public"];
        const commandArgs = process.platform === "win32"
            ? ["/d", "/s", "/c", `npx ${args.join(" ")}`]
            : args;

        const driftLog = fs.openSync('drift.sql', 'w');
        const child = spawn(command, commandArgs, {
            stdio: ['inherit', driftLog, 'inherit'],
            env: { ...process.env },
        });
        child.on("exit", (code) => {
            fs.closeSync(driftLog);
            resolve(code);
        });
    });
}

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    const match = envFile.match(/^SUPABASE_DB_PASSWORD=(.+)$/m);
    if (match) {
        process.env.SUPABASE_DB_PASSWORD = match[1].trim().replace(/^["']|["']$/g, "");
    }
}

(async () => {
    console.log("Checking for database drift...");
    const code = await runSupabaseDrift();
    if (code === 0) {
        if (fs.existsSync('drift.sql')) {
            const content = fs.readFileSync('drift.sql', 'utf-8');
            if (content.match(/CREATE|ALTER|DROP|INSERT|UPDATE|DELETE/i)) {
                console.log("❌ Drift detected!");
                console.log(content);
            } else {
                console.log("✅ No drift detected.");
            }
        }
    } else {
        console.error("Drift check failed with code", code);
    }
})();
