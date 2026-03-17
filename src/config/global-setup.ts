import { chromium } from "@playwright/test";
import { LoginPage } from "../pages";
import { ENV } from "./env.config";
import * as fs from "fs";
import * as path from "path";

const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Playwright globalSetup – runs ONCE before all tests.
 *
 * Launches a persistent Edge context to satisfy Azure AD
 * Conditional Access, performs MSAL + TOTP login, and saves
 * storageState for all tests to reuse.
 *
 * Skips entirely when a fresh storageState file already exists.
 * To force re-login: delete .auth/storage-state.json
 */
async function globalSetup() {
  if (!ENV.hasCredentials) {
    console.log("[Global Setup] No credentials configured – skipping");
    return;
  }

  if (ENV.FORCE_FRESH_LOGIN) {
    console.log("[Global Setup] LOOPIN_FORCE_FRESH_LOGIN=true – clearing previous auth state");
    if (fs.existsSync(ENV.STORAGE_STATE_PATH)) {
      fs.rmSync(ENV.STORAGE_STATE_PATH, { force: true });
    }
    if (fs.existsSync(ENV.EDGE_PROFILE_DIR)) {
      fs.rmSync(ENV.EDGE_PROFILE_DIR, { recursive: true, force: true });
    }
  }

  if (!ENV.FORCE_FRESH_LOGIN && fs.existsSync(ENV.STORAGE_STATE_PATH)) {
    const age = Date.now() - fs.statSync(ENV.STORAGE_STATE_PATH).mtimeMs;
    if (age < MAX_AGE_MS) {
      console.log(
        `[Global Setup] storageState is fresh (${Math.round(age / 60000)}m old) – skipping login`
      );
      return;
    }
    console.log("[Global Setup] storageState expired – re-logging in");
  }

  if (!fs.existsSync(ENV.EDGE_PROFILE_DIR)) {
    fs.mkdirSync(ENV.EDGE_PROFILE_DIR, { recursive: true });
  }

  console.log("[Global Setup] Launching persistent Edge context...");
  const context = await chromium.launchPersistentContext(
    ENV.EDGE_PROFILE_DIR,
    {
      channel: "msedge",
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ["--disable-blink-features=AutomationControlled"],
    }
  );

  const page = context.pages()[0] || (await context.newPage());

  await page.goto(ENV.BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const isLoggedIn = !ENV.FORCE_FRESH_LOGIN && !page.url().includes("/login");

  if (isLoggedIn) {
    console.log(
      `[Global Setup] Already logged in (${page.url()}) – skipping login`
    );
  } else {
    console.log("[Global Setup] Performing MSAL + TOTP login...");
    const loginPage = new LoginPage(page);

    await loginPage.loginWithMicrosoft({
      username: ENV.USERNAME,
      password: ENV.PASSWORD,
      totpSecret: ENV.TOTP_SECRET,
    });

    await loginPage.verifySuccessfulLogin();
  }

  const storageDir = path.dirname(ENV.STORAGE_STATE_PATH);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  await context.storageState({ path: ENV.STORAGE_STATE_PATH });
  console.log(
    `[Global Setup] storageState saved to ${ENV.STORAGE_STATE_PATH}`
  );

  await context.close();
}

export default globalSetup;
