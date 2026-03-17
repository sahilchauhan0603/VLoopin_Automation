import { Page, Locator } from "@playwright/test";
import { ENV } from "../config/env.config";

/**
 * Abstract base page providing shared helper methods.
 * Every page object in the framework extends this class.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // ── Navigation ────────────────────────────────────────────────

  async navigateTo(path: string): Promise<void> {
    const url = path.startsWith("http") ? path : `${ENV.BASE_URL}${path}`;
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async waitForUrl(
    urlPattern: string | RegExp,
    timeout = 30000
  ): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  // ── Element interactions ──────────────────────────────────────

  async clickElement(locator: Locator): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.click();
  }

  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    await locator.click();
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Opens a Radix-UI <Select> trigger, waits for the listbox,
   * and clicks the matching option.
   *
   * Uses multiple strategies to find the option:
   *  1. getByRole("option") with exact name match
   *  2. getByRole("option") with partial (case-insensitive) match
   *  3. Text-based locator as last resort
   */
  async selectDropdownByTestId(
    testId: string,
    optionText: string
  ): Promise<void> {
    const trigger = this.page.getByTestId(testId);
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    // Wait for the Radix portal to render the dropdown content
    await this.page.waitForTimeout(500);

    const listbox = this.page.locator('[role="listbox"]');
    await listbox.waitFor({ state: "visible", timeout: 10000 });

    // Strategy 1: Exact match via role
    const escaped = this.escapeRegex(optionText);
    let option = listbox.getByRole("option", {
      name: new RegExp(`^\\s*${escaped}\\s*$`, "i"),
    });

    if ((await option.count()) === 0) {
      // Strategy 2: Partial / contains match via role
      option = listbox.getByRole("option", {
        name: new RegExp(escaped, "i"),
      });
    }

    if ((await option.count()) === 0) {
      // Strategy 3: Text-based locator inside the listbox
      option = listbox.locator(`text=${optionText}`);
    }

    await option.first().waitFor({ state: "visible", timeout: 10000 });
    await option.first().scrollIntoViewIfNeeded();
    await option.first().click();

    // Wait for the dropdown to close
    await listbox.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }

  // ── Toast helpers ─────────────────────────────────────────────

  async getToastMessage(): Promise<string> {
    const toast = this.page
      .locator('[role="status"], [data-sonner-toast]')
      .first();
    await toast.waitFor({ state: "visible", timeout: 15000 });
    return (await toast.textContent()) || "";
  }

  // ── Wait helpers ──────────────────────────────────────────────

  async waitForLoadingToDisappear(): Promise<void> {
    const loader = this.page.locator(".animate-spin").first();
    try {
      await loader.waitFor({ state: "visible", timeout: 3000 });
      await loader.waitFor({ state: "hidden", timeout: 30000 });
    } catch {
      // loader never appeared – page already loaded
    }
  }

  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    try {
      await this.page.waitForLoadState("networkidle", { timeout });
    } catch {
      // network didn't reach idle – proceed anyway
    }
  }

  // ── Visibility ────────────────────────────────────────────────

  async isElementVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ── Private ───────────────────────────────────────────────────

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
