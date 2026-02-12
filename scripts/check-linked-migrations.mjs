import { spawn } from "node:child_process";

const supabaseArgs = ["supabase", "migration", "list", "--linked"];

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
