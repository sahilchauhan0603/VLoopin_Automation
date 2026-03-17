import { test, expect } from "../src/fixtures/test.fixture";
import referralData from "../src/data/referral.data.json";
import type { ReferralData } from "../src/pages/referrals.page";

test.describe("Referrals - Test Suite", () => {
  let createdReferral: ReferralData | null = null;

  const generateUniqueReferralData = (): ReferralData => {
    const baseData = referralData.validReferral as ReferralData;
    const timestamp = Date.now();

    return {
      ...baseData,
      email: `priya.sharma.referral.${timestamp}@example.com`,
    };
  };

  test("TC_REF_01: Open Submit Referral form", async ({ referralsPage }) => {
    await referralsPage.openSubmitReferralForm();
    await expect(referralsPage.submitReferralBtn).toBeVisible();
  });

  test("TC_REFERRALS_01: Verify required fields prevent blank submission", async ({
    referralsPage,
  }) => {
    await referralsPage.openSubmitReferralForm();
    await referralsPage.submitBlankReferral();

    await referralsPage.verifyRequiredFieldErrors([
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Resume",
      "Requisition",
      "Total Experience",
      "Current Company",
      "Current Designation",
      "Current CTC",
      "Expected CTC",
      "Notice Period",
      "Primary Skills",
      "Relationship to Candidate",
      "How do you know this person",
      "Why are you recommending this person",
    ]);
  });

  test("TC_REFERRALS_02: Create referral successfully", async ({ referralsPage }) => {
    const testData = generateUniqueReferralData();
    createdReferral = testData;

    await referralsPage.openSubmitReferralForm();
    await referralsPage.uploadResume("src/data/test-resume.doc");
    await referralsPage.fillReferralForm(testData);
    await referralsPage.submitReferral();
    await referralsPage.verifyReferralSubmissionSuccess();
  });

  test("TC_REFERRALS_03: Edge - duplicate candidate email blocks referral submission", async ({
    referralsPage,
  }) => {
    test.skip(!createdReferral, "Requires a successfully created referral from TC_REFERRALS_02");

    await referralsPage.openSubmitReferralForm();
    await referralsPage.enterCandidateEmail(createdReferral!.email);
    await referralsPage.verifyDuplicateReferralBlocked();
  });
});