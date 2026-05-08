import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const SCREENSHOT_MODE = process.env.E2E_SCREENSHOTS === "on" ? "on" : "only-on-failure";
const E2E_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://bravita-e2e.supabase.co";
const E2E_SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  "anon-public-e2e-placeholder";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: SCREENSHOT_MODE,
    video: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI
      ? `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT}`
      : `npm run dev:vite -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      VITE_E2E_AUTH_STATE: "true",
      VITE_SUPABASE_URL: E2E_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: E2E_SUPABASE_ANON_KEY,
      VITE_USE_BFF_AUTH: "false",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
