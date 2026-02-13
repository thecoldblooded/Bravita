import { spawn } from "node:child_process";

const supabaseArgs = ["supabase", "migration", "list", "--linked"];

import fs from "node:fs";
import path from "node:path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    const match = envFile.match(/^SUPABASE_DB_PASSWORD=(.+)$/m);
    if (match) {
      process.env.SUPABASE_DB_PASSWORD = match[1].trim().replace(/^["']|["']$/g, "");
      console.log("Loaded SUPABASE_DB_PASSWORD from .env");
    }
  }
} catch (err) {
  console.warn("Could not read .env file:", err);
}

if (process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_DB_PASSWORD.trim().length > 0) {
  supabaseArgs.push("--password", process.env.SUPABASE_DB_PASSWORD);
}

let command = "npx";
let commandArgs = supabaseArgs;

if (process.platform === "win32") {
  const escaped = supabaseArgs.join(" ");
  command = "cmd.exe";
  commandArgs = ["/d", "/s", "/c", `npx ${escaped}`];
}

const child = spawn(command, commandArgs, {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start Supabase CLI:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
