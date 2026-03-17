import { defineConfig } from "@playwright/test";
import { ENV } from "./src/config/env.config";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list", { printSteps: true }],
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
