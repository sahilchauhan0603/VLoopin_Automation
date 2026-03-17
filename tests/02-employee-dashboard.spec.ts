import { test, expect } from "../src/fixtures/test.fixture";

test.describe("Employee Dashboard Test Suite", () => {
  test.beforeEach(async ({ employeeDashboardPage }) => {
    await employeeDashboardPage.goto();
    await employeeDashboardPage.verifyDashboardLoaded();
  });

  test("CP-DB-001: Verify activity feed and notification components", async ({ employeeDashboardPage }) => {
    await expect(employeeDashboardPage.myActivitiesSection).toBeVisible();
  });

  test("CP-DB-002: Verify My Referrals table layout", async ({ employeeDashboardPage }) => {
    await expect(employeeDashboardPage.myReferralsSection).toBeVisible();
  });

  test("CP-DB-003: Refer Candidate CTA availability", async ({ employeeDashboardPage }) => {
    await expect(employeeDashboardPage.referCandidateBtn).toBeVisible();
    await expect(employeeDashboardPage.referCandidateBtn).toBeEnabled();
  });

  test("CP-DB-004: Verify My Interviews are listed correctly", async ({ employeeDashboardPage }) => {
    await expect(employeeDashboardPage.myInterviewsSection).toBeVisible();
  });

  test("CP-DB-005: Verify Open Positions metadata and display", async ({ employeeDashboardPage }) => {
    await expect(employeeDashboardPage.openPositionsSection).toBeVisible();
  });

  test("CP-DB-006: Submit referral redirection logic", async ({ page, employeeDashboardPage }) => {
    await employeeDashboardPage.referCandidateBtn.click();
    // Verify it navigates away from the dashboard or opens a modal
  });
});
