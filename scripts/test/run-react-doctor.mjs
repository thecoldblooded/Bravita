import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BIN_NAMES = process.platform === "win32"
  ? ["react-doctor.cmd", "react-doctor.exe", "react-doctor.bat", "react-doctor"]
  : ["react-doctor"];

function resolveLocalBinary() {
  const binDir = path.resolve(ROOT, "node_modules", ".bin");
  for (const name of BIN_NAMES) {
    const candidate = path.resolve(binDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const binary = resolveLocalBinary();

if (!binary) {
  console.warn("[react-doctor] Local binary not found in node_modules/.bin; skipping offline check.");
  process.exit(0);
}

const result = spawnSync(binary, [".", "--scope", "full", "--offline", "--blocking", "warning"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("[react-doctor] Failed to run:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
