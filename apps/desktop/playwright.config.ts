import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }]
      ]
    : "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:1420",
    locale: "en-US",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "pnpm dev -- --host 127.0.0.1",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
