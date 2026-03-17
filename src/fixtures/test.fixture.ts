import { test as base } from "@playwright/test";
import { LoginPage } from "../page-objects/01-login/login.page";
import { RequisitionListPage } from "../page-objects/02-requisitions/requisition-list.page";
import { RequisitionFormPage } from "../page-objects/02-requisitions/requisition-form.page";
import { EmployeeDashboardPage } from "../page-objects/03-employee-dashboard/employee-dashboard.page";
import { ReferralsPage } from "../page-objects/04-referrals/referrals.page";

/**
 * Extends Playwright's base test with page object fixtures.
 *
 * Login is handled once by global-setup (persistent Edge).
 * Tests reuse the saved storageState via playwright.config.ts.
 */
export const test = base.extend<{
  loginPage: LoginPage;
  requisitionListPage: RequisitionListPage;
  requisitionFormPage: RequisitionFormPage;
  employeeDashboardPage: EmployeeDashboardPage;
  referralsPage: ReferralsPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  requisitionListPage: async ({ page }, use) => {
    await use(new RequisitionListPage(page));
  },

  requisitionFormPage: async ({ page }, use) => {
    await use(new RequisitionFormPage(page));
  },

  employeeDashboardPage: async ({ page }, use) => {
    await use(new EmployeeDashboardPage(page));
  },

  referralsPage: async ({ page }, use) => {
    await use(new ReferralsPage(page));
  },
});

export { expect } from "@playwright/test";
