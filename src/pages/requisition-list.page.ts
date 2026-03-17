import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for the /requisitions list page.
 */
export class RequisitionListPage extends BasePage {
  private readonly pageHeading = this.page.locator(
    'h1:has-text("Requisitions")'
  );
  private readonly createRequisitionBtn = this.page.getByTestId(
    "button-create-requisition"
  );
  private readonly searchInput = this.page.getByTestId(
    "input-search-requisitions"
  );
  private readonly requisitionFormDialog = this.page.getByTestId(
    "card-requisition-form"
  );

  async goto(): Promise<void> {
    await this.navigateTo("/requisitions");
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.pageHeading.waitFor({ state: "visible", timeout: 30000 });
    await this.waitForLoadingToDisappear();
    await this.waitForNetworkIdle();
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.pageHeading).toBeVisible({ timeout: 20000 });
    await expect(this.createRequisitionBtn).toBeVisible();
  }

  async clickCreateRequisition(): Promise<void> {
    await this.createRequisitionBtn.scrollIntoViewIfNeeded();
    await this.clickElement(this.createRequisitionBtn);
    await this.requisitionFormDialog.waitFor({
      state: "visible",
      timeout: 15000,
    });
    await this.waitForNetworkIdle();
    await this.page.waitForTimeout(2000);
  }

  async searchRequisition(searchTerm: string): Promise<void> {
    await this.fillInput(this.searchInput, searchTerm);
    await this.page.waitForTimeout(2000);
    await this.waitForLoadingToDisappear();
  }

  async isRequisitionVisible(code: string): Promise<boolean> {
    return this.isElementVisible(this.page.locator(`text=${code}`));
  }
}
