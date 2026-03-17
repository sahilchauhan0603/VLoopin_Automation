import { test, expect } from "../src/fixtures/test.fixture";
import requisitionData from "../src/data/requisition.data.json";
import type { RequisitionData } from "../src/page-objects/02-requisitions/requisition-form.page";

test.describe("Requisitions - Test Suite", () => {
  test.beforeEach(async ({ requisitionListPage }) => {
    await requisitionListPage.goto();
    await requisitionListPage.verifyPageLoaded();
  });

  test("TC_REQ_01: Navigate to Requisitions page and verify elements", async ({
    page,
  }) => {
    await expect(page.locator('h1:has-text("Requisitions")')).toBeVisible();
    await expect(
      page.getByTestId("button-create-requisition")
    ).toBeVisible();
    await expect(
      page.getByTestId("input-search-requisitions")
    ).toBeVisible();
  });

  test("TC_REQ_02: Open Create Requisition form dialog", async ({
    requisitionListPage,
    requisitionFormPage,
  }) => {
    await requisitionListPage.clickCreateRequisition();
    await requisitionFormPage.verifyFormVisible();
  });

  test("TC_REQ_03: Create QA Engineer requisition – 2-3 yrs, Full Time, Noida, Hybrid, Low, Kipu", async ({
    requisitionListPage,
    requisitionFormPage,
  }) => {
    const testData = requisitionData.qaEngineerRequisition as RequisitionData;

    // Step 1 – Open Create Requisition dialog
    await requisitionListPage.clickCreateRequisition();
    await requisitionFormPage.verifyFormVisible();

    // Step 2 – Fill all required fields (data-driven from JSON)
    await requisitionFormPage.fillRequisitionForm(testData);

    // Step 3 – Submit for approval
    await requisitionFormPage.submitForApproval();

    // Step 4 – Verify success
    await requisitionFormPage.verifySubmissionSuccess();
  });

  test("TC_REQ_04: Validate empty form submission shows error", async ({
    requisitionListPage,
    requisitionFormPage,
  }) => {
    await requisitionListPage.clickCreateRequisition();
    await requisitionFormPage.verifyFormVisible();

    // Submit without filling anything
    await requisitionFormPage.submitForApproval();

    // Should block with first required-field error
    await requisitionFormPage.verifyValidationError("Job Title is required.");
  });

  test("TC_REQ_05: Verify Save as Draft enforces only the first 7 fields + Job Description as mandatory", async ({
    requisitionListPage,
    requisitionFormPage,
  }) => {
    const testData = requisitionData.minimalDraftRequisition as RequisitionData;  

    await requisitionListPage.clickCreateRequisition();
    await requisitionFormPage.verifyFormVisible();

    // Fill ONLY the first 7 fields + Job Description: Job Title, Department, Hiring Type, Stream, Designation, Location, Work Mode, Job Description
    await requisitionFormPage.fillJobTitle(testData.jobTitle);
    await requisitionFormPage.selectDepartment(testData.department);
    await requisitionFormPage.selectHiringType(testData.hiringType);
    await requisitionFormPage.selectStream(testData.stream);
    await requisitionFormPage.selectDesignation(testData.designation);
    await requisitionFormPage.selectLocation(testData.location);
    await requisitionFormPage.selectWorkMode(testData.workMode);
    await requisitionFormPage.fillJobDescription(testData.jobDescription);

    // Leave remaining fields blank and save as draft
    await requisitionFormPage.saveAsDraft();

    // Verify it is saved successfully
    await requisitionFormPage.verifySubmissionSuccess();
  });

  test("TC_REQ_06: Attempt to draft with one of first 7 fields blank or Job Description missing", async ({
    page,
    requisitionListPage,
    requisitionFormPage,
  }) => {
    const testData = requisitionData.minimalDraftRequisition as RequisitionData;  

    await requisitionListPage.clickCreateRequisition();
    await requisitionFormPage.verifyFormVisible();

    // Fill the first 7 fields (leaving Job Description blank)
    await requisitionFormPage.fillJobTitle(testData.jobTitle);
    await requisitionFormPage.selectDepartment(testData.department);
    await requisitionFormPage.selectHiringType(testData.hiringType);
    await requisitionFormPage.selectStream(testData.stream);
    await requisitionFormPage.selectDesignation(testData.designation);
    await requisitionFormPage.selectLocation(testData.location);
    await requisitionFormPage.selectWorkMode(testData.workMode);
    // Deliberately skipped: await requisitionFormPage.fillJobDescription(testData.jobDescription);

    // Attempt to save as draft
    await requisitionFormPage.saveAsDraft();

    // Verify validation blocks saving
    await expect(page.locator("text=/cannot be empty/i").first()).toBeVisible({ timeout: 5000 });
  });

});
