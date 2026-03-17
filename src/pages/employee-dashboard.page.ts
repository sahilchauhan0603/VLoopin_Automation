import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class EmployeeDashboardPage extends BasePage {
  // Locators
  readonly dashboardHeading = this.page.getByRole("heading", { name: "Employee Dashboard" });
  readonly profileButton = this.page.getByTestId("button-profile");
  
  // Sections
  readonly myActivitiesSection = this.page.locator("div").filter({ hasText: /^My Activities$/ }).first();
  readonly myActivitiesList = this.myActivitiesSection.locator("ul > li, .activity-item"); // Fallback selectors

  readonly myReferralsSection = this.page.locator("div").filter({ hasText: /^My Referrals$/ }).first();
  readonly referCandidateBtn = this.page.getByRole("button", { name: /Refer Candidate/i });

  readonly myInterviewsSection = this.page.locator("div").filter({ hasText: /^My Interviews$/ }).first();

  readonly openPositionsSection = this.page.locator("div").filter({ hasText: /^Open Positions$/ }).first();
  readonly openPositionsTable = this.openPositionsSection.locator("table");
  
  async goto(): Promise<void> {
    await this.navigateTo("/employee-dashboard");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async verifyDashboardLoaded(): Promise<void> {
    await expect(this.dashboardHeading).toBeVisible({ timeout: 15000 });
  }

}
