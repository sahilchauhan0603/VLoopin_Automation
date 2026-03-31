# Loopin Automation

Playwright + TypeScript UI automation framework for the Loopin application. The project follows a Page Object Model approach, keeps test data separate from test logic, and uses a reusable authenticated session to speed up execution.

## What This Project Covers

- Login page validation and Microsoft sign-in flow
- Employee dashboard coverage
- Requisition creation and draft scenarios
- Referral form positive, negative, and edge-case validation
- HTML reporting plus a custom dashboard report

## Tech Stack

- Playwright
- TypeScript
- Microsoft Edge / Chromium channel
- `dotenv` for configuration
- `speakeasy` for TOTP-based MFA

## Project Structure

```text
Automation/
|-- playwright.config.ts
|-- package.json
|-- .env.example
|-- scripts/
|   `-- encrypt-password.js
|-- src/
|   |-- config/
|   |   |-- env.config.ts
|   |   `-- global-setup.ts
|   |-- data/
|   |   |-- login.data.json
|   |   |-- requisition.data.json
|   |   |-- referral.data.json
|   |   `-- test-resume.doc
|   |-- fixtures/
|   |   |-- auth.setup.ts
|   |   `-- test.fixture.ts
|   |-- page-objects/
|   |   |-- 00-shared/
|   |   |-- 01-login/
|   |   |-- 02-requisitions/
|   |   |-- 03-employee-dashboard/
|   |   `-- 04-referrals/
|   |-- reporters/
|   |   `-- custom-dashboard.reporter.ts
|   `-- utils/
|       |-- password-crypto.ts
|       `-- totp.helper.ts
|-- tests/
|   |-- 01-login.spec.ts
|   |-- 02-employee-dashboard.spec.ts
|   |-- 03-requisition.spec.ts
|   `-- 04-referrals.spec.ts
`-- README.md
```

## How Authentication Works

The framework uses `globalSetup` to create and reuse authenticated state.

1. Before the test run, Playwright checks for `.auth/storage-state.json`.
2. If the session is still fresh, the login step is skipped.
3. Otherwise, a persistent Microsoft Edge context is launched.
4. The framework completes Microsoft login and TOTP-based MFA.
5. The authenticated session is saved and reused by the tests.

Set `LOOPIN_FORCE_FRESH_LOGIN=true` if you want a brand-new login on every run.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install Playwright browsers

```bash
npm run install:browsers
```

### 3. Configure environment variables

Create `.env` from the sample file and update it with valid values:

```bash
cp .env.example .env
```

Required configuration:

```env
LOOPIN_BASE_URL=https://vhiredev.z22.web.core.windows.net
LOOPIN_USERNAME=your.name@company.com
LOOPIN_PASSWORD=
LOOPIN_TOTP_SECRET=your-base32-totp-secret
LOOPIN_TIMEOUT=60000
LOOPIN_RETRIES=2
LOOPIN_WORKERS=2
LOOPIN_FORCE_FRESH_LOGIN=false
```

### Optional: use encrypted password

Instead of storing `LOOPIN_PASSWORD` in plain text, generate an encrypted value:

```bash
npm run encrypt:password -- --generate-key "your-password"
```

Then place the generated values in `.env`:

```env
LOOPIN_PASSWORD_ENCRYPTED=encv1:<iv>:<tag>:<ciphertext>
LOOPIN_PASSWORD_KEY=<base64-key>
```

If both `LOOPIN_PASSWORD` and `LOOPIN_PASSWORD_ENCRYPTED` are present, the plain-text password is used first.

## Running Tests

Run the full suite:

```bash
npm test
```

Useful run modes:

```bash
npm run test:ui
npm run test:headed
npm run test:debug
```

Run a specific spec file:

```bash
npx playwright test tests/04-referrals.spec.ts
```

Run a single test by title:

```bash
npx playwright test tests/04-referrals.spec.ts --grep "TC_REFERRALS_03: Create referral successfully"
```

Run a single test by line number:

```bash
npx playwright test tests/04-referrals.spec.ts:37 --headed
```

## Reports

After execution, reports are generated in:

- `playwright-report/` for the standard Playwright HTML report
- `custom-report/` for the custom dashboard report
- `test-results/` for run artifacts such as traces, screenshots, and videos

Open the default Playwright report with:

```bash
npm run report
```

To check whether the custom report exists:

```bash
npm run report:custom
```

## Cleaning Test Artifacts

Start fresh by deleting all generated artifacts in one command:

```bash
Remove-Item -Path "test-results", "playwright-report", "custom-report" -Recurse -Force -ErrorAction SilentlyContinue
```

## Framework Conventions

- Page objects live under `src/page-objects/`
- Shared fixtures are defined in `src/fixtures/test.fixture.ts`
- Test data is stored in `src/data/*.json`
- Environment parsing is centralized in `src/config/env.config.ts`
- Reporting is configured in `playwright.config.ts`

## Adding New Coverage

1. Add or update a page object in `src/page-objects/`
2. Register it in `src/fixtures/test.fixture.ts` if tests need fixture access
3. Keep reusable data in `src/data/`
4. Add a new `.spec.ts` file under `tests/`

## Notes

- The suite is designed around Microsoft Edge because the authentication flow uses a persistent Edge profile.
- A fresh login is automatically triggered when the saved session expires.
- Referral tests use the sample resume file in `src/data/test-resume.doc`.

---

## Jenkins CI/CD Integration

This project includes a fully configured Jenkins pipeline for automated test execution, reporting, and notifications.

### Prerequisites

| Requirement | Version |
|---|---|
| Jenkins | 2.426+ (LTS) |
| Docker | 20.10+ (installed on the Jenkins node) |
| Java | 17+ (for Jenkins) |
| Git | 2.30+ |

### Quick Start

```bash
# 1. Build the Docker image (one-time)
npm run docker:build

# 2. Run tests in Docker locally (to verify)
npm run docker:test
```

### Jenkins Plugins Required

Install these from **Manage Jenkins → Plugins → Available plugins**:

| Plugin | Purpose |
|---|---|
| **Pipeline** | Core pipeline support (often pre-installed) |
| **Docker Pipeline** | Run pipeline stages inside Docker containers |
| **HTML Publisher** | Publish Playwright HTML and custom dashboard reports |
| **JUnit** | Parse test results XML for trend graphs |
| **Email Extension** | Rich HTML email notifications on failure/recovery |
| **Credentials** | Store secrets securely (often pre-installed) |
| **AnsiColor** | Colorized console output |
| **Workspace Cleanup** | Clean workspace after builds |
| **Timestamper** | Timestamps in console output |

### Setting Up Credentials

Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**:

| ID | Kind | Value |
|---|---|---|
| `LOOPIN_USERNAME` | Secret text | Your Microsoft login email |
| `LOOPIN_PASSWORD` | Secret text | Your login password |
| `LOOPIN_TOTP_SECRET` | Secret text | Your base32 TOTP secret |

### Creating the Pipeline Job

1. **New Item** → Enter name `Loopin-Automation` → Select **Multibranch Pipeline** → OK
2. Under **Branch Sources** → **Add source** → **Git**
3. Enter your repository URL
4. Under **Build Configuration** → Mode: **by Jenkinsfile** → Script Path: `Jenkinsfile`
5. Under **Scan Multibranch Pipeline Triggers** → check **Periodically if not otherwise run** → interval: `1 hour`
6. Click **Save**

### Parameterized Builds

Click **Build with Parameters** in Jenkins to customize each run:

| Parameter | Options | Default |
|---|---|---|
| `TEST_SUITE` | all / login / dashboard / requisition / referrals | all |
| `BROWSER` | msedge / chromium | msedge |
| `WORKERS` | 1-4 | 2 |
| `RETRIES` | 0-3 | 2 |
| `BASE_URL` | Any URL | `https://vhiredev.z22.web.core.windows.net` |
| `FORCE_FRESH_LOGIN` | true / false | true |

### Reports in Jenkins

After each build, three report types are available:

- **Test Trend Graph** – JUnit results on the build dashboard (pass/fail trends over time)
- **Playwright Report** – Full interactive HTML report (left sidebar → "Playwright Report")
- **Custom Dashboard** – Your custom visual dashboard (left sidebar → "Custom Dashboard")

### Scheduled Runs

The pipeline runs automatically on **weekdays at ~6:00 AM IST**. Change the schedule by editing the `cron` trigger in the `Jenkinsfile`.

### Email Notifications

Emails are sent automatically when:

- ❌ **Build fails** – with links to logs and reports
- ⚠️ **Tests are unstable** – some tests failed
- ✅ **Build recovers** – after a previous failure

Configure the SMTP server in **Manage Jenkins → System → Extended E-mail Notification**.

### Docker Commands

```bash
# Build the image
npm run docker:build

# Run all tests in Docker
npm run docker:test

# Run with custom env vars
docker run --rm --ipc=host \
  -e CI=true \
  -e LOOPIN_USERNAME=user@company.com \
  -e LOOPIN_PASSWORD=secret \
  -e LOOPIN_TOTP_SECRET=base32secret \
  loopin-playwright

# Run a specific suite
docker run --rm --ipc=host -e CI=true loopin-playwright \
  npx playwright test tests/04-referrals.spec.ts
```
