import { test as base } from "@playwright/test";
import {
  LoginPage,
  RequisitionListPage,
  RequisitionFormPage,
  EmployeeDashboardPage,
  ReferralsPage,
} from "../pages";

type PageObjects = {
  loginPage: LoginPage;
  requisitionListPage: RequisitionListPage;
  requisitionFormPage: RequisitionFormPage;
  employeeDashboardPage: EmployeeDashboardPage;
  referralsPage: ReferralsPage;
};

/**
 * Extends Playwright's base test with page object fixtures.
 *
 * Login is handled once by global-setup (persistent Edge).
 * Tests reuse the saved storageState via playwright.config.ts.
 */
export const test = base.extend<PageObjects>({
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
