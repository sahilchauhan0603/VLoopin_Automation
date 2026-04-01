/**
 * seed-edge-profile.js
 *
 * One-time interactive script to seed the .edge-profile directory
 * with your company's Microsoft/Edge browser profile.
 *
 * WHY: Azure AD / Entra ID Conditional Access often requires a
 *      "compliant" or "managed" browser profile. Playwright's
 *      default isolated context doesn't satisfy this. By manually
 *      signing into Edge's browser-level profile ONCE in headed
 *      mode, we persist those credentials into .edge-profile/
 *      so that all future headless runs pass Conditional Access.
 *
 * HOW TO RUN:
 *   npm run seed:profile
 *
 * WHAT TO DO:
 *   1. Edge will open with a blank page
 *   2. Click the profile icon (top-right of Edge) and sign in
 *      with your company Microsoft account (e.g. sahil.chauhan@veersatech.com)
 *   3. Complete any MFA prompts
 *   4. Wait for profile sync to finish
 *   5. Close the browser OR press Ctrl+C in the terminal
 *   6. Done! Future `npm test` runs will use this seeded profile
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const EDGE_PROFILE_DIR = path.resolve(__dirname, "../.edge-profile");

async function seedProfile() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           Edge Profile Seeding (One-Time Setup)             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Profile directory: ${EDGE_PROFILE_DIR}`);
  console.log();

  // Ensure profile directory exists
  if (!fs.existsSync(EDGE_PROFILE_DIR)) {
    fs.mkdirSync(EDGE_PROFILE_DIR, { recursive: true });
    console.log("[Seed] Created fresh profile directory");
  } else {
    console.log("[Seed] Using existing profile directory");
  }

  console.log("[Seed] Launching Edge in headed mode...");
  console.log();
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  INSTRUCTIONS:                                              │");
  console.log("│                                                             │");
  console.log("│  1. Click the profile icon (top-right corner of Edge)       │");
  console.log("│  2. Sign in with your company Microsoft account             │");
  console.log("│  3. Complete any MFA/2FA prompts                            │");
  console.log("│  4. Wait for 'Sync is on' confirmation                      │");
  console.log("│  5. Close the browser window when done                      │");
  console.log("│                                                             │");
  console.log("│  After this, all automated tests will use this profile.     │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log();

  const context = await chromium.launchPersistentContext(EDGE_PROFILE_DIR, {
    channel: "msedge",
    headless: false,
    viewport: null, // Use full window size
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = context.pages()[0] || (await context.newPage());

  // Navigate to Edge settings profile page so user can sign in easily
  await page.goto("edge://settings/profiles", {
    waitUntil: "domcontentloaded",
  }).catch(() => {
    // edge:// URLs may not work via goto, open a blank page instead
    return page.goto("https://www.microsoft.com", {
      waitUntil: "domcontentloaded",
    });
  });

  console.log("[Seed] Browser is open. Waiting for you to sign in...");
  console.log("[Seed] Close the browser window when you are done.");
  console.log();

  // Wait for the browser to be closed by the user
  await new Promise((resolve) => {
    context.on("close", resolve);

    // Also handle Ctrl+C gracefully
    process.on("SIGINT", async () => {
      console.log("\n[Seed] Ctrl+C received – closing browser...");
      await context.close().catch(() => {});
      resolve();
    });

    process.on("SIGTERM", async () => {
      await context.close().catch(() => {});
      resolve();
    });
  });

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ Profile seeded successfully!                            ║");
  console.log("║                                                             ║");
  console.log("║  Your Edge profile is saved in: .edge-profile/              ║");
  console.log("║  All future test runs will reuse this profile.              ║");
  console.log("║                                                             ║");
  console.log("║  Run tests with:  npm test                                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

seedProfile().catch((err) => {
  console.error("[Seed] Fatal error:", err.message);
  process.exit(1);
});
