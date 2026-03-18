# Loopin – Playwright UI Automation Framework

**Playwright + TypeScript** automation framework for the Loopin application using **Page Object Model (POM)** and **Data-driven** patterns.

## Architecture

```
Automation/
├── playwright.config.ts            # Playwright config (single project, globalSetup)
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies and npm scripts
├── .env.example                    # Environment variable template
│
├── src/
│   ├── config/
│   │   ├── env.config.ts           # Reads .env → typed ENV singleton
│   │   └── global-setup.ts         # One-time login via persistent Edge
│   │
│   ├── pages/                      # Page Object Model (POM)
│   │   ├── base.page.ts            # Abstract base with shared helpers
│   │   ├── login.page.ts           # Login – MSAL popup + Speakeasy TOTP
│   │   ├── requisition-list.page.ts
│   │   ├── requisition-form.page.ts
│   │   └── index.ts                # Barrel exports
│   │
│   ├── fixtures/
│   │   └── test.fixture.ts         # Custom fixtures: page objects via DI
│   │
│   ├── utils/
│   │   └── totp.helper.ts          # Speakeasy TOTP generation
│   │
│   └── data/                       # Test data (data-driven approach)
│       ├── login.data.json
│       └── requisition.data.json
│
└── tests/                          # Test specifications
    ├── login.spec.ts
    ├── employee-dashboard.spec.ts
    └── create-requisition.spec.ts
```

### Framework Patterns

| Pattern | Location |
|---------|----------|
| **Page Object Model** | `src/pages/` – each page maps to a class extending `BasePage` |
| **Data-driven** | `src/data/*.json` – test data separated from logic |
| **Fixture-based DI** | `src/fixtures/test.fixture.ts` – page objects injected into tests |
| **Global auth setup** | `src/config/global-setup.ts` – login once, all tests reuse the session |

### Authentication Flow

1. `globalSetup` checks if a fresh `storageState` exists – skips login if so
2. Otherwise, launches a persistent **Microsoft Edge** context (Conditional Access compliance)
3. Navigates to `/login` → click **Sign in with Microsoft**
4. MSAL popup: email → password → Speakeasy TOTP for MFA
5. Handles "Stay signed in?" and Edge profile prompts
6. Saves `storageState` to `.auth/storage-state.json`
7. All tests reuse this session – no re-login needed

### Force fresh login every run

Set this in `.env`:

```
LOOPIN_FORCE_FRESH_LOGIN=true
```

When enabled (set to true), global setup clears saved storage state and Edge profile before starting, so each run performs a brand-new login flow.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install browsers

```bash
npm run install:browsers
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```
LOOPIN_BASE_URL=https://vhiredev.z22.web.core.windows.net
LOOPIN_USERNAME=youremail@veersatech.com
LOOPIN_PASSWORD=<your-password>
LOOPIN_TOTP_SECRET=<your-base32-totp-secret>
LOOPIN_RETRIES=2
```

You can also store the password in encrypted form instead of plain text:

```bash
npm run encrypt:password -- --generate-key "your-password"
```

Then place the output in your environment:

```
LOOPIN_USERNAME=sahil.chauhan@veersatech.com
LOOPIN_PASSWORD_ENCRYPTED=encv1:<iv>:<tag>:<ciphertext>
LOOPIN_PASSWORD_KEY=<base64-32-byte-key>
```

If both `LOOPIN_PASSWORD` and `LOOPIN_PASSWORD_ENCRYPTED` are present, the plain-text value is used first for backward compatibility.

> For real security, keep `LOOPIN_PASSWORD_KEY` outside the same shared `.env` file whenever possible, such as a machine-level environment variable or CI secret.

`LOOPIN_RETRIES=2` means Playwright will retry a failed test 2 more times, so the total attempts become 3.

> **TOTP Secret**: The base32-encoded secret from your Microsoft Authenticator setup. If you only have a QR code, decode it to extract the secret parameter.

## Running Tests

```bash
# Run all tests
npm test

# Playwright UI mode (interactive)
npm run test:ui

# Run with visible browser
npm run test:headed

# Debug mode (step-by-step inspector)
npm run test:debug

# Run specific suites
npm run test:login
npm run test:requisition
npm run test:dashboard

# View HTML report
npm run report
```

### Run a particular test case in headed mode

```bash
# Run a single test file in headed mode
npx playwright test tests/04-referrals.spec.ts --headed

# Run one specific test in that file by test title
npx playwright test tests/04-referrals.spec.ts --headed --grep "TC_REFERRALS_02: Create referral successfully"

# Run one specific test by line number in headed mode
npx playwright test tests/04-referrals.spec.ts:21 --headed
```

If your test title includes spaces or special characters, keep it inside quotes with `--grep`.

## Adding New Tests

### 1. Create a page object

Create `src/pages/my-feature.page.ts` extending `BasePage`:

```typescript
import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class MyFeaturePage extends BasePage {
  private readonly heading = this.page.getByRole("heading", { name: "My Feature" });

  async goto(): Promise<void> {
    await this.navigateTo("/my-feature");
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
```

### 2. Export from barrel

Add to `src/pages/index.ts`:

```typescript
export { MyFeaturePage } from "./my-feature.page";
```

### 3. Register fixture

Add to `src/fixtures/test.fixture.ts`:

```typescript
myFeaturePage: async ({ page }, use) => {
  await use(new MyFeaturePage(page));
},
```

### 4. Write tests

```typescript
import { test, expect } from "../src/fixtures/test.fixture";

test.describe("My Feature", () => {
  test("loads correctly", async ({ myFeaturePage }) => {
    await myFeaturePage.goto();
    await myFeaturePage.verifyLoaded();
  });
});
```

### Adding data-driven tests

Add a dataset to the relevant JSON in `src/data/`. Data-driven suites in `tests/` automatically pick up complete datasets.
