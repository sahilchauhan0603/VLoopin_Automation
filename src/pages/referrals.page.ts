import { expect, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export interface ReferralData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentLocation: string;
  totalExperience: string;
  relevantExperience?: string;
  currentCompany: string;
  currentDesignation?: string;
  currentCTC: string;
  expectedCTC: string;
  noticePeriod?: string;
  primarySkills: string;
  secondarySkills?: string;
  preferredLocations?: string;
  yearOfPassing?: string;
  candidatePan?: string;
  howDoYouKnow: string;
  whyRecommend: string;
}

export class ReferralsPage extends BasePage {
  readonly submitReferralBtn = this.page.getByRole("button", {
    name: /Submit Referral/i,
  });
  readonly candidateInfoTitle = this.page
    .getByText(/Candidate Information/i)
    .first();
  readonly resumeInfoDialog = this.page.getByRole("alertdialog", {
    name: /Resume Upload Information/i,
  });
  readonly resumeInfoGotItBtn = this.page.getByRole("button", {
    name: /Got it/i,
  });
  readonly resumeInput = this.page.getByTestId("input-resume");
  readonly resumeRemoveBtn = this.page.getByRole("button", { name: /Remove/i });
  readonly resumeErrorText = this.page.getByText(
    /resume is required\. please upload candidate's resume/i
  );
  readonly candidateFirstNameInput = this.page.getByTestId(
    "input-candidate-first-name"
  );
  readonly candidateLastNameInput = this.page.getByTestId(
    "input-candidate-last-name"
  );
  readonly candidateEmailInput = this.page.getByTestId("input-candidate-email");
  readonly candidatePhoneInput = this.page.getByTestId("input-candidate-phone");
  readonly candidatePanInput = this.page.getByTestId("input-candidate-pan");
  readonly candidateLocationInput = this.page.getByTestId(
    "input-candidate-location"
  );
  readonly requisitionSelect = this.page.getByTestId("select-requisition");
  readonly totalExperienceInput = this.page.getByTestId("input-total-experience");
  readonly relevantExperienceInput = this.page.getByTestId(
    "input-relevant-experience"
  );
  readonly currentCompanyInput = this.page.getByTestId("input-current-company");
  readonly currentDesignationInput = this.page.getByTestId(
    "input-current-designation"
  );
  readonly currentCTCInput = this.page.getByTestId("input-current-ctc");
  readonly expectedCTCInput = this.page.getByTestId("input-expected-ctc");
  readonly noticePeriodInput = this.page.getByTestId("input-notice-period");
  readonly primarySkillsTextarea = this.page.getByTestId("textarea-primary-skills");
  readonly yearOfPassingInput = this.page.getByTestId("input-year-of-passing");
  readonly relationshipSelect = this.page.getByTestId("select-relationship");
  readonly howDoYouKnowTextarea = this.page.getByTestId("textarea-how-know");
  readonly whyRecommendTextarea = this.page.getByTestId("textarea-why-recommend");
  readonly duplicateReferralWarning = this.page.getByText(
    "You can't submit a referral for this candidate as they are already registered in our system."
  );
  readonly parsingResumeText = this.page.getByText(/Parsing resume\.\.\./i);

  async openSubmitReferralForm(): Promise<void> {
    await this.navigateTo("/referrals/submit");
    await this.page.waitForLoadState("domcontentloaded");

    await this.resumeInfoDialog
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});

    if (await this.resumeInfoDialog.isVisible().catch(() => false)) {
      await this.resumeInfoGotItBtn.click();
      await expect(this.resumeInfoDialog).toBeHidden({ timeout: 10000 });
    }

    await expect(this.submitReferralBtn).toBeVisible({ timeout: 15000 });
    await expect(this.candidateInfoTitle).toBeVisible({ timeout: 15000 });
  }

  async uploadResume(
    file:
      | string
      | {
          name: string;
          mimeType: string;
          buffer: Buffer;
        }
  ): Promise<void> {
    await this.resumeInput.setInputFiles(file);
  }

  async waitForResumeProcessingToFinish(): Promise<void> {
    await this.parsingResumeText.waitFor({ state: "hidden", timeout: 30000 }).catch(
      () => {}
    );
  }

  async fillReferralForm(
    data: ReferralData,
    options?: {
      selectRequisition?: boolean;
      selectRelationship?: boolean;
    }
  ): Promise<void> {
    const { selectRequisition = true, selectRelationship = true } = options ?? {};

    await this.fillInput(this.candidateFirstNameInput, data.firstName);
    await this.fillInput(this.candidateLastNameInput, data.lastName);
    await this.fillInput(this.candidateEmailInput, data.email);
    await this.fillInput(this.candidatePhoneInput, data.phone);
    await this.fillInput(this.candidateLocationInput, data.currentLocation);

    if (data.candidatePan !== undefined) {
      await this.fillInput(this.candidatePanInput, data.candidatePan);
    }

    if (selectRequisition) {
      await this.selectFirstAvailableOption(this.requisitionSelect);
    }

    await this.fillInput(this.totalExperienceInput, data.totalExperience);

    if (data.relevantExperience !== undefined) {
      await this.fillInput(this.relevantExperienceInput, data.relevantExperience);
    }

    await this.fillInput(this.currentCompanyInput, data.currentCompany);

    if (data.currentDesignation !== undefined) {
      await this.fillInput(this.currentDesignationInput, data.currentDesignation);
    }

    await this.fillInput(this.currentCTCInput, data.currentCTC);
    await this.fillInput(this.expectedCTCInput, data.expectedCTC);

    if (data.noticePeriod !== undefined) {
      await this.fillInput(this.noticePeriodInput, data.noticePeriod);
    }

    await this.fillInput(this.primarySkillsTextarea, data.primarySkills);

    if (data.yearOfPassing !== undefined) {
      await this.fillInput(this.yearOfPassingInput, data.yearOfPassing);
    }

    if (selectRelationship) {
      await this.selectFirstAvailableOption(this.relationshipSelect);
    }

    await this.fillInput(this.howDoYouKnowTextarea, data.howDoYouKnow);
    await this.fillInput(this.whyRecommendTextarea, data.whyRecommend);
  }

  async submitReferral(): Promise<void> {
    await this.submitReferralBtn.scrollIntoViewIfNeeded();
    await this.submitReferralBtn.click();
  }

  async enterCandidateEmail(email: string): Promise<void> {
    await this.fillInput(this.candidateEmailInput, email);
  }

  async expectResumeRequiredError(): Promise<void> {
    await expect(this.resumeErrorText).toBeVisible({ timeout: 10000 });
  }

  async verifyDuplicateReferralBlocked(): Promise<void> {
    await expect(this.duplicateReferralWarning).toBeVisible({ timeout: 15000 });
    await expect(this.submitReferralBtn).toBeDisabled();
  }

  async verifyReferralSubmissionSuccess(): Promise<void> {
    // await Promise.race([
    //   this.expectToast(/Referral submitted successfully!/i, 30000),
    //   this.page.waitForURL(/employee-dashboard/i, { timeout: 30000 }),
    // ]);
    const successToast = this.page
      .locator('[role="status"], [data-sonner-toast], .sonner-toast')
      .filter({ hasText: /success|submitted/i })
      .last();
    await expect(successToast).toBeVisible({ timeout: 20000 });
  }

  async expectToast(message: string | RegExp, timeout = 15000): Promise<void> {
    const textMatcher =
      typeof message === "string"
        ? new RegExp(this.escapePattern(message), "i")
        : message;
    const toast = this.page.getByText(textMatcher).last();

    await expect(toast).toBeVisible({ timeout });
  }

  async removeResume(): Promise<void> {
    await this.resumeRemoveBtn.click();
  }

  private async selectFirstAvailableOption(trigger: Locator): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await expect(trigger).toBeEnabled({ timeout: 15000 });
    await trigger.scrollIntoViewIfNeeded();
    const tagName = await trigger.evaluate((node) => node.tagName.toLowerCase());

    if (tagName === "select") {
      const options = await trigger.locator("option").all();
      if (options.length > 1) {
        const value = await options[1].getAttribute("value");
        if (value) {
          await trigger.selectOption(value);
          return;
        }
      }
    }

    await trigger.click();

    const popupOption = this.page
      .locator(
        [
          '[cmdk-item]:not([aria-disabled="true"])',
          '[role="option"]:not([aria-disabled="true"])',
          '[data-radix-popper-content-wrapper] [data-value]',
          '[data-radix-select-content] [role="option"]:not([aria-disabled="true"])',
        ].join(", ")
      )
      .first();

    if (await popupOption.isVisible().catch(() => false)) {
      await popupOption.scrollIntoViewIfNeeded();
      await popupOption.click();
      return;
    }

    await this.page.keyboard.press("ArrowDown");
    await this.page.keyboard.press("Enter");
  }

  private escapePattern(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
