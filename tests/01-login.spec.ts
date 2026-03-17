import { test, expect } from "../src/fixtures/test.fixture";
import { ENV } from "../src/config/env.config";
import loginData from "../src/data/login.data.json";

test.describe("Login Page - Test Suite", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test("TC_LOGIN_01: Verify login page loads with correct branding", async ({
    loginPage,
    page,
  }) => {
    await loginPage.verifyLoginPageLoaded();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(loginData.loginPageValidation.heading, "i"),
      })
    ).toBeVisible();

    await expect(
      page.getByText(
        new RegExp(loginData.loginPageValidation.description, "i")
      )
    ).toBeVisible();
  });

  test("TC_LOGIN_02: Verify Sign in with Microsoft button", async ({
    page,
  }) => {
    const btn = page.getByRole("button", {
      name: new RegExp(loginData.loginPageValidation.buttonText, "i"),
    });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("TC_LOGIN_03: Verify Veersa LOOPIN logo", async ({ page }) => {
    const logo = page.locator(
      `img[alt="${loginData.loginPageValidation.logoAlt}"]`
    );
    await expect(logo).toBeVisible();
  });
});

test.describe("Login - Microsoft MSAL with Speakeasy TOTP", () => {
  test("TC_LOGIN_04: Login with Microsoft credentials and TOTP", async ({
    loginPage,
  }) => {
    test.skip(
      !ENV.hasCredentials,
      "LOOPIN_USERNAME / LOOPIN_PASSWORD not set in .env"
    );

    await loginPage.loginWithMicrosoft({
      username: ENV.USERNAME,
      password: ENV.PASSWORD,
      totpSecret: ENV.TOTP_SECRET,
    });

    await loginPage.verifySuccessfulLogin();
  });

  test("TC_LOGIN_05: Authenticated user is redirected away from /login", async ({
    loginPage,
    page,
  }) => {
    test.skip(
      !ENV.hasCredentials,
      "LOOPIN_USERNAME / LOOPIN_PASSWORD not set in .env"
    );

    await loginPage.loginWithMicrosoft({
      username: ENV.USERNAME,
      password: ENV.PASSWORD,
      totpSecret: ENV.TOTP_SECRET,
    });
    await loginPage.verifySuccessfulLogin();

    // Revisit /login while authenticated
    await page.goto("/login");
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain("/login");
  });
});
