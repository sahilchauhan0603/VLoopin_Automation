#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────
// scripts/docker-test.js
// ──────────────────────────────────────────────────────────────
// Runs the Playwright test suite inside the loopin-playwright
// Docker container with:
//   • .env file injected at runtime (secrets never baked in)
//   • .auth + .edge-profile mounted for session persistence
//   • Reports mounted back to the host for viewing
//
// Usage:
//   node scripts/docker-test.js              (run all tests)
//   node scripts/docker-test.js login        (run login suite)
//   node scripts/docker-test.js referrals    (run referrals suite)
// ──────────────────────────────────────────────────────────────

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IMAGE_NAME = "loopin-playwright:latest";

// Map suite names to test commands inside the container
const SUITE_MAP = {
  all: "npm run test:ci",
  login: "CI=true npx playwright test tests/01-login.spec.ts",
  dashboard: "CI=true npx playwright test tests/02-employee-dashboard.spec.ts",
  requisition: "CI=true npx playwright test tests/03-requisition.spec.ts",
  referrals: "CI=true npx playwright test tests/04-referrals.spec.ts",
};

const suite = (process.argv[2] || "all").toLowerCase();
const testCmd = SUITE_MAP[suite];

if (!testCmd) {
  console.error(`Unknown suite "${suite}". Valid options: ${Object.keys(SUITE_MAP).join(", ")}`);
  process.exit(1);
}

// Ensure mount directories exist on the host
const dirs = [".auth", ".edge-profile", "test-results", "playwright-report", "custom-report"];
for (const dir of dirs) {
  const full = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
  }
}

// Check .env exists
const envPath = path.join(PROJECT_ROOT, ".env");
if (!fs.existsSync(envPath)) {
  console.error("ERROR: .env file not found. Copy .env.example to .env and fill in values.");
  process.exit(1);
}

// Build the docker run command
const dockerArgs = [
  "docker run --rm",
  "--ipc=host",                                          // Required for Chromium
  `--env-file "${envPath}"`,                             // Inject secrets at runtime
  "-e CI=true",                                          // Enable CI mode (JUnit output)
  `-v "${path.join(PROJECT_ROOT, ".auth")}:/app/.auth"`,                       // Persist login state
  `-v "${path.join(PROJECT_ROOT, ".edge-profile")}:/app/.edge-profile"`,       // Persist Edge profile
  `-v "${path.join(PROJECT_ROOT, "test-results")}:/app/test-results"`,         // Get test artifacts
  `-v "${path.join(PROJECT_ROOT, "playwright-report")}:/app/playwright-report"`, // Get HTML report
  `-v "${path.join(PROJECT_ROOT, "custom-report")}:/app/custom-report"`,       // Get custom dashboard
  IMAGE_NAME,
  testCmd,
].join(" ");

console.log(`\n🐳 Running Loopin Automation in Docker`);
console.log(`   Suite:   ${suite}`);
console.log(`   Image:   ${IMAGE_NAME}`);
console.log(`   Command: ${testCmd}\n`);

try {
  execSync(dockerArgs, {
    stdio: "inherit",
    cwd: PROJECT_ROOT,
    shell: true,
  });
  console.log("\n✅ Docker test run completed successfully!");
} catch (error) {
  console.error("\n⚠️  Docker test run finished with failures (see report above)");
  process.exit(error.status || 1);
}
