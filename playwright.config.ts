import { defineConfig } from "@playwright/test";
import { ENV } from "./src/config/env.config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: ENV.RETRIES,
  workers: ENV.WORKERS,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list", { printSteps: true }],
    ["./src/reporters/custom-dashboard.reporter.ts"],
    // JUnit XML output for Jenkins test trend tracking (CI only)
    ...(process.env.CI
      ? [["junit", { outputFile: "test-results/junit-results.xml" }] as const]
      : []),
  ],

  globalSetup: "./src/config/global-setup.ts",

  use: {
    browserName: "chromium",
    channel: "msedge",
    baseURL: ENV.BASE_URL,
    storageState: ENV.STORAGE_STATE_PATH,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: "e2e-tests",
      testMatch: /.*\.spec\.ts$/,
      timeout: ENV.TIMEOUT,
    },
  ],

  timeout: ENV.TIMEOUT,
  expect: { timeout: 15000 },
  outputDir: "test-results",
});
