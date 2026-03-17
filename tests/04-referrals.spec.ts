import { test, expect } from "../src/fixtures/test.fixture";
import referralData from "../src/data/referral.data.json";
import type { ReferralData } from "../src/pages/referrals.page";

test.describe("Referrals - Negative and Edge Coverage", () => {
  const baseReferralData = referralData.validReferral as ReferralData;

  const currentYear = new Date().getFullYear();

  const createReferralData = (overrides: Partial<ReferralData> = {}): ReferralData => {
    const timestamp = Date.now();

    return {
      ...baseReferralData,
      currentDesignation: "Senior QA Engineer",
      relevantExperience: "4",
      yearOfPassing: "2020",
      email: `priya.sharma.referral.${timestamp}@example.com`,
      ...overrides,
    };
  };

  test.beforeEach(async ({ referralsPage }) => {
    await referralsPage.openSubmitReferralForm();
  });

  test("TC_REFERRALS_01: Open Submit Referral form", async ({ referralsPage }) => {
    await expect(referralsPage.submitReferralBtn).toBeVisible();
    await expect(referralsPage.candidateInfoTitle).toBeVisible();
  });

  test("TC_REFERRALS_02: Resume is mandatory before submission", async ({
    referralsPage,
  }) => {
    await referralsPage.fillReferralForm(createReferralData());
    await referralsPage.submitReferral();

    await referralsPage.expectResumeRequiredError();
  });

  test("TC_REFERRALS_03: Create referral successfully", async ({
    referralsPage,
    page,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(createReferralData());
    await referralsPage.submitReferral();
    await referralsPage.verifyReferralSubmissionSuccess();
  });

  test("TC_REFERRALS_04: Invalid email format is blocked", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ email: "invalid-email-format" })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(/Please enter a valid email address\./i);
  });

  test("TC_REFERRALS_05: PAN shorter than 10 characters is rejected", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ candidatePan: "ABCDE1234" })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(/PAN must be exactly 10 characters\./i);
  });

  test("TC_REFERRALS_06: PAN format must match AAAAA9999A", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ candidatePan: "1234EABCDE" })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(/Invalid PAN format\./i);
  });

  test("TC_REFERRALS_07: Relevant experience cannot exceed total experience", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({
        totalExperience: "3",
        relevantExperience: "5",
      })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      /Relevant experience cannot be greater than total experience\./i
    );
  });

  test("TC_REFERRALS_08: Expected CTC cannot be less than Current CTC", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({
        currentCTC: "1800000",
        expectedCTC: "1500000",
      })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      /Expected CTC cannot be less than Current CTC\./i
    );
  });

  test("TC_REFERRALS_09: Year of passing cannot be earlier than 1950", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ yearOfPassing: "1949" })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      new RegExp(`Year of Passing must be between 1950 and ${currentYear}\\.`, "i")
    );
  });

  test("TC_REFERRALS_10: Year of passing cannot be in the future", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ yearOfPassing: String(currentYear + 1) })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      new RegExp(`Year of Passing must be between 1950 and ${currentYear}\\.`, "i")
    );
  });

  test('TC_REFERRALS_11: "How do you know this person?" must be at least 50 characters', async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ howDoYouKnow: "Worked together for two years in QA." })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      /"How do you know this person\?" must be at least 50 characters/i
    );
  });

  test('TC_REFERRALS_12: "Why are you recommending?" must be at least 100 characters', async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({
        whyRecommend:
          "Strong tester with good communication and ownership across delivery teams.",
      })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      /"Why are you recommending\?" must be at least 100 characters/i
    );
  });

  test("TC_REFERRALS_13: Relationship selection is required", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(createReferralData(), {
      selectRelationship: false,
    });
    await referralsPage.submitReferral();

    await referralsPage.expectToast(/Relationship to Candidate is required/i);
  });

  test("TC_REFERRALS_14: Requisition selection is required", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(createReferralData(), {
      selectRequisition: false,
    });
    await referralsPage.submitReferral();

    await referralsPage.expectToast(
      /Please select a requisition and ensure you are logged in\./i
    );
  });

  test("TC_REFERRALS_15: Negative total experience is rejected", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(
      createReferralData({ totalExperience: "-1" })
    );
    await referralsPage.submitReferral();

    await referralsPage.expectToast(/Total Experience cannot be negative\./i);
  });

  test("TC_REFERRALS_16: Invalid resume file type is rejected", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume({
      name: "candidate.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("plain text resume"),
    });

    await referralsPage.expectToast(/Only PDF, DOC, and DOCX files are allowed/i);
    await expect(referralsPage.resumeRemoveBtn).toBeHidden();
  });

  test("TC_REFERRALS_17: Resume larger than 5MB is rejected", async ({
    referralsPage,
  }) => {
    await referralsPage.uploadResume({
      name: "oversized-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "a"),
    });

    await referralsPage.expectToast(/File size must be less than 5MB/i);
    await expect(referralsPage.resumeRemoveBtn).toBeHidden();
  });

  test("TC_REFERRALS_18: Duplicate candidate email disables a second referral", async ({
    referralsPage,
    page,
  }) => {
    const createdReferral = createReferralData({
      email: `duplicate.referral.${Date.now()}@example.com`,
    });

    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.waitForResumeProcessingToFinish();
    await referralsPage.fillReferralForm(createdReferral);
    await referralsPage.submitReferral();
    await referralsPage.verifyReferralSubmissionSuccess();

    await page.waitForURL(/employee-dashboard/i, { timeout: 30000 });

    await referralsPage.openSubmitReferralForm();
    await referralsPage.enterCandidateEmail(createdReferral.email);

    await referralsPage.verifyDuplicateReferralBlocked();
  });
});
