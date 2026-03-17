import { test as setup, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/01-login/login.page";
import { ENV } from "../config/env.config";
import * as fs from "fs";
import * as path from "path";

/**
 * Authentication setup project.
 *
 * Runs ONCE before "authenticated-tests". Performs the full
 * MSAL + Speakeasy TOTP login flow, then persists the browser's
 * storage state to disk so every subsequent test reuses the session.
 *
 * Skips gracefully when credentials are not configured.
 */
setup("authenticate via Microsoft MSAL with Speakeasy TOTP", async ({ page }) => {
  setup.skip(
    !ENV.hasCredentials,
    "LOOPIN_USERNAME or LOOPIN_PASSWORD not set in .env – skipping auth setup"
  );

  const loginPage = new LoginPage(page);

  await loginPage.loginWithMicrosoft({
    username: ENV.USERNAME,
    password: ENV.PASSWORD,
    totpSecret: ENV.TOTP_SECRET,
  });

  await loginPage.verifySuccessfulLogin();

  // Ensure the .auth directory exists
  const storageDir = path.dirname(ENV.STORAGE_STATE_PATH);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  await page.context().storageState({ path: ENV.STORAGE_STATE_PATH });
  console.log("[Auth Setup] Storage state saved to", ENV.STORAGE_STATE_PATH);
});
