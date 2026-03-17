import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";
import { generateTOTP } from "../utils/totp.helper";
import { ENV } from "../config/env.config";

export interface LoginCredentials {
  username: string;
  password: string;
  totpSecret?: string;
}

/**
 * Page Object for the Loopin /login page.
 *
 * Handles the full Microsoft MSAL popup flow:
 *   Email → Password → MFA (Speakeasy TOTP) → Stay signed in
 */
export class LoginPage extends BasePage {
  private readonly authenticatedUrlPattern =
    /\/(employee-dashboard|dashboard|requisitions)/;

  // ── Locators ──────────────────────────────────────────────────

  private readonly signInWithMicrosoftBtn = this.page.getByRole("button", {
    name: /sign in with microsoft/i,
  });
  private readonly welcomeHeading = this.page.getByRole("heading", {
    name: /welcome to vHire portal/i,
  });
  private readonly logo = this.page.locator('img[alt="Veersa LOOPIN Logo"]');

  // ── Public API ────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.navigateTo("/login");
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async verifyLoginPageLoaded(): Promise<void> {
    await expect(this.signInWithMicrosoftBtn).toBeVisible({ timeout: 30000 });
  }

  /**
   * Navigates to /login, waits for the SPA to render, and checks
   * whether the user is already authenticated (redirect away from /login).
   * If still on /login, performs the full MSAL popup + TOTP flow.
   */
  async loginWithMicrosoft(credentials: LoginCredentials): Promise<void> {
    if (ENV.FORCE_FRESH_LOGIN) {
      console.log(
        "[Login] LOOPIN_FORCE_FRESH_LOGIN=true - clearing app auth state before login"
      );
      await this.page.context().clearCookies();
      await this.page.goto(ENV.BASE_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
      await this.page
        .evaluate(() => {
          window.localStorage.clear();
          window.sessionStorage.clear();
        })
        .catch(() => {});
    }

    await this.goto();

    // If the persistent Edge profile already has SSO, the app may
    // have auto-redirected away from /login
    if (!this.page.url().includes("/login")) {
      console.log("[Login] Already authenticated (SSO) – skipping MSAL flow");
      return;
    }

    await this.verifyLoginPageLoaded();

    console.log("[Login] Opening MSAL popup...");
    const popupPromise = this.page.waitForEvent("popup");
    await this.signInWithMicrosoftBtn.click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");

    await this.handleMicrosoftAuth(popup, credentials);
  }

  async verifySuccessfulLogin(): Promise<void> {
    if (!this.authenticatedUrlPattern.test(this.page.url())) {
      await this.page.waitForURL(this.authenticatedUrlPattern, {
        timeout: ENV.TIMEOUT,
        waitUntil: "domcontentloaded",
      });
    }

    const url = this.getCurrentUrl();
    console.log(`[Login] Verified login – URL: ${url}`);
    expect(url).toMatch(this.authenticatedUrlPattern);
  }

  // ── Private: Microsoft popup auth flow ────────────────────────

  private async handleMicrosoftAuth(
    popup: Page,
    credentials: LoginCredentials
  ): Promise<void> {
    if (
      await this.runPopupStep("dismiss Edge profile prompt", popup, async () =>
        this.dismissEdgeProfilePrompt(popup)
      )
    ) {
      return;
    }

    if (
      await this.runPopupStep("dismiss account picker", popup, async () =>
        this.dismissAccountPicker(popup)
      )
    ) {
      return;
    }

    if (
      await this.runPopupStep("enter email", popup, async () =>
        this.enterEmail(popup, credentials.username)
      )
    ) {
      return;
    }

    if (
      await this.runPopupStep("enter password", popup, async () =>
        this.enterPassword(popup, credentials.password)
      )
    ) {
      return;
    }

    if (
      await this.runPopupStep("handle MFA", popup, async () =>
        this.handleMFA(popup, credentials.totpSecret)
      )
    ) {
      return;
    }

    if (
      await this.runPopupStep("handle stay signed in", popup, async () =>
        this.handleStaySignedIn(popup)
      )
    ) {
      return;
    }

    await this.waitForLoginComplete(popup);
  }

  private async runPopupStep(
    stepName: string,
    popup: Page,
    step: () => Promise<void>
  ): Promise<boolean> {
    if (popup.isClosed()) {
      return this.handleClosedPopup(stepName);
    }

    try {
      await step();
      return false;
    } catch (error) {
      if (this.isPopupClosedError(error) || popup.isClosed()) {
        return this.handleClosedPopup(stepName);
      }
      throw error;
    }
  }

  private isPopupClosedError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return /target page, context or browser has been closed|page has been closed/i.test(
      error.message
    );
  }

  private async handleClosedPopup(stepName: string): Promise<boolean> {
    await this.page
      .waitForURL(this.authenticatedUrlPattern, {
        timeout: 15000,
        waitUntil: "domcontentloaded",
      })
      .catch(() => {});

    if (this.authenticatedUrlPattern.test(this.page.url())) {
      console.log(
        `[Login] Popup closed during '${stepName}', but session is already authenticated.`
      );
      return true;
    }

    throw new Error(
      `[Login] Microsoft popup closed unexpectedly during '${stepName}' before authentication completed.`
    );
  }

  private async dismissEdgeProfilePrompt(popup: Page): Promise<void> {
    try {
      const switchBtn = popup.getByRole("button", {
        name: "Switch Edge profile",
      });
      const emailInput = popup.locator('input[type="email"]');

      await Promise.race([
        switchBtn.waitFor({ state: "visible", timeout: 8000 }),
        emailInput.waitFor({ state: "visible", timeout: 8000 }),
      ]);

      if (await switchBtn.isVisible()) {
        console.log("[Login] Edge profile prompt – clicking Switch...");
        await switchBtn.click();
        await popup.waitForTimeout(3000);
      }
    } catch {
      console.log("[Login] No Edge profile prompt – continuing");
    }
  }

  private async dismissAccountPicker(popup: Page): Promise<void> {
    try {
      const useAnother = popup.locator("#otherTileText");
      const emailInput = popup.locator('input[type="email"]');

      await Promise.race([
        useAnother.waitFor({ state: "visible", timeout: 10000 }),
        emailInput.waitFor({ state: "visible", timeout: 10000 }),
      ]);

      if (await useAnother.isVisible()) {
        await useAnother.click();
        await popup.waitForTimeout(1000);
      }
    } catch {
      // Neither appeared – continue
    }
  }

  private async enterEmail(popup: Page, email: string): Promise<void> {
    console.log("[Login] Entering email...");
    const emailInput = popup.locator('input[type="email"]');
    await emailInput.waitFor({ state: "visible", timeout: 15000 });
    await emailInput.fill(email);
    await popup.locator('input[type="submit"][value="Next"]').click();
  }

  private async enterPassword(popup: Page, password: string): Promise<void> {
    console.log("[Login] Entering password...");
    const passwordInput = popup.locator('input[type="password"]');
    await passwordInput.waitFor({ state: "visible", timeout: 15000 });
    await passwordInput.fill(password);
    await popup.locator('input[type="submit"][value="Sign in"]').click();
  }

  /**
   * MFA flow: "I can't use my Microsoft" → "Use a verification code" → OTC input
   */
  private async handleMFA(popup: Page, totpSecret?: string): Promise<void> {
    try {
      console.log("[Login] Waiting for MFA screen...");
      await popup.waitForTimeout(1500);

      const cantUseLink = popup.getByRole("link", {
        name: "I can't use my Microsoft",
      });
      const useCodeBtn = popup.getByRole("button", {
        name: "Use a verification code",
      });
      const otcInput = popup.locator(
        'input[name="otc"], input#idTxtBx_SAOTC_OTC'
      );

      await Promise.race([
        cantUseLink.waitFor({ state: "visible", timeout: 15000 }),
        useCodeBtn.waitFor({ state: "visible", timeout: 15000 }),
        otcInput.first().waitFor({ state: "visible", timeout: 15000 }),
      ]);

      // Some tenants land directly on the code-entry screen.
      if (await otcInput.first().isVisible().catch(() => false)) {
        console.log("[Login] MFA code input already visible");
        await this.submitTOTPCode(popup, otcInput.first(), totpSecret);
        return;
      }

      if (await cantUseLink.isVisible()) {
        console.log('[Login] "I can\'t use my Microsoft" link – clicking...');
        await cantUseLink.click();
        await popup.waitForTimeout(2000);
      }

      if (await useCodeBtn.isVisible().catch(() => false)) {
        console.log('[Login] "Use a verification code" – clicking...');
        await useCodeBtn.click();
      } else if (await cantUseLink.isVisible().catch(() => false)) {
        // If we clicked "can't use" and are still not on code input,
        // attempt one more wait for the option.
        await useCodeBtn.waitFor({ state: "visible", timeout: 10000 });
        await useCodeBtn.click();
      }

      const codeInput = popup.locator(
        'input[name="otc"], input#idTxtBx_SAOTC_OTC, input[name="iOttPin"]'
      );
      await codeInput.first().waitFor({ state: "visible", timeout: 10000 });
      console.log("[Login] TOTP code input visible");

      await this.submitTOTPCode(popup, codeInput.first(), totpSecret);
    } catch {
      console.log("[Login] No MFA challenge – proceeding");
    }
  }

  private async submitTOTPCode(
    popup: Page,
    input: ReturnType<Page["locator"]>,
    totpSecret?: string
  ): Promise<void> {
    const totp = generateTOTP(totpSecret);
    if (!totp) {
      console.log("[Login] No TOTP secret configured – cannot enter code");
      return;
    }

    console.log("[Login] Entering TOTP code...");
    await input.fill(totp);

    const submitBtn = popup.locator(
      'input[type="submit"][value="Verify"], button:has-text("Verify"), input[type="submit"][value="Yes"], button:has-text("Yes"), input#idSubmit_SAOTC_Continue, button#idSubmit_SAOTC_Continue, input[type="submit"]'
    );
    await submitBtn.first().waitFor({ state: "visible", timeout: 5000 });
    await submitBtn.first().click();

    console.log("[Login] TOTP code submitted");
    await popup.waitForTimeout(2000);
  }

  private async handleStaySignedIn(popup: Page): Promise<void> {
    try {
      const yesBtn = popup.locator('input[type="submit"][value="Yes"]');
      const switchBtn = popup.getByRole("button", {
        name: "Switch Edge profile",
      });

      await Promise.race([
        yesBtn.waitFor({ state: "visible", timeout: 10000 }),
        switchBtn.waitFor({ state: "visible", timeout: 10000 }),
      ]);

      if (await yesBtn.isVisible().catch(() => false)) {
        console.log('[Login] "Stay signed in?" → Yes');
        await yesBtn.click();
        return;
      }

      if (await switchBtn.isVisible().catch(() => false)) {
        console.log("[Login] Edge profile prompt after MFA – switching...");
        await switchBtn.click();
        await popup.waitForTimeout(3000);
      }
    } catch {
      // Prompt not shown or popup already closed
    }
  }

  private async waitForLoginComplete(popup: Page): Promise<void> {
    console.log("[Login] Waiting for login to complete...");

    try {
      await Promise.race([
        popup
          .waitForEvent("close", { timeout: 30000 })
          .then(() => console.log("[Login] Popup closed")),
        this.page
          .waitForURL(/\/(employee-dashboard|dashboard|requisitions)/, {
            timeout: 30000,
            waitUntil: "domcontentloaded",
          })
          .then(() => console.log("[Login] Main page redirected")),
      ]);
    } catch {
      console.log(
        `[Login] Login completion timed out – URL: ${this.page.url()}`
      );
    }
  }
}
