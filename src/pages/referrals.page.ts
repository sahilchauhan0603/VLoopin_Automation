import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface ReferralData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentLocation: string;
  totalExperience: string;
  currentCompany: string;
  currentDesignation: string;
  currentCTC: string;
  expectedCTC: string;
  primarySkills: string;
  howDoYouKnow: string;
  whyRecommend: string;
}

export class ReferralsPage extends BasePage {
  readonly dashboardHeading = this.page.getByRole("heading", {
    name: "Employee Dashboard",
  });
  readonly referCandidateBtn = this.page.getByRole("button", {
    name: /Refer Candidate/i,
  });
  readonly submitReferralBtn = this.page.getByRole("button", {
    name: /Submit Referral/i,
  });
  readonly candidateInfoTitle = this.page
    .locator("text=/Candidate Information/i")
    .first();
  readonly resumeInfoDialog = this.page.getByRole("alertdialog", {
    name: /Resume Upload Information/i,
  });
  readonly resumeInfoGotItBtn = this.page.getByRole("button", {
    name: /Got it/i,
  });
  readonly toastMessage = this.page
    .locator('[role="status"], [data-sonner-toast], .sonner-toast')
    .first();
  readonly candidateEmailInput = this.page.getByPlaceholder(/Enter Candidate email/i);
  readonly duplicateReferralWarning = this.page.getByText(
    "You can't submit a referral for this candidate as they are already registered in our system."
  );

  async openSubmitReferralForm(): Promise<void> {
    await this.navigateTo("/employee-dashboard");
    await expect(this.dashboardHeading).toBeVisible({ timeout: 15000 });
    await this.referCandidateBtn.click();
    await this.page.waitForLoadState("domcontentloaded");

    if (await this.resumeInfoDialog.isVisible().catch(() => false)) {
      await this.resumeInfoGotItBtn.click();
    }

    await expect(this.submitReferralBtn).toBeVisible({ timeout: 15000 });
    await expect(this.candidateInfoTitle).toBeVisible({ timeout: 15000 });
  }

  async submitBlankReferral(): Promise<void> {
    await this.submitReferralBtn.scrollIntoViewIfNeeded();
    await this.submitReferralBtn.click();
  }

  async uploadResume(filePath: string): Promise<void> {
    await this.page.locator('input[type="file"]').first().setInputFiles(filePath);
  }

  async fillReferralForm(data: ReferralData): Promise<void> {
    await this.page.getByPlaceholder(/e\.g\., Priya/i).fill(data.firstName);
    await this.page.getByPlaceholder(/e\.g\., Sharma/i).fill(data.lastName);
    await this.page.getByPlaceholder(/Enter Candidate email/i).fill(data.email);
    await this.page.getByPlaceholder(/\+91 98765 43210/i).fill(data.phone);
    await this.page
      .getByPlaceholder(/e\.g\., Mumbai, Maharashtra/i)
      .fill(data.currentLocation);

    await this.selectOptionFromComboboxPlaceholder("Select requisition");

    await this.page
      .locator('input[type="number"], input[role="spinbutton"]')
      .first()
      .fill(data.totalExperience);
    await this.page
      .getByPlaceholder(/e\.g\., Tech Solutions Pvt Ltd/i)
      .fill(data.currentCompany);
    await this.page
      .getByPlaceholder(/e\.g\., Senior Software Engineer/i)
      .fill(data.currentDesignation);
    await this.page.getByPlaceholder(/e\.g\., 15,00,000/i).fill(data.currentCTC);
    await this.page.getByPlaceholder(/e\.g\., 18,00,000/i).fill(data.expectedCTC);

    await this.selectOptionFromComboboxPlaceholder("Select notice period");

    await this.page
      .getByPlaceholder(/e\.g\., Java, Spring Boot, Microservices/i)
      .fill(data.primarySkills);
    await this.page
      .getByPlaceholder(/Describe how you know the candidate/i)
      .fill(data.howDoYouKnow);
    await this.page
      .getByPlaceholder(/Tell us what makes this candidate a great fit/i)
      .fill(data.whyRecommend);

    await this.selectOptionFromComboboxPlaceholder("Select relationship");
  }

  async submitReferral(): Promise<void> {
    await this.submitReferralBtn.scrollIntoViewIfNeeded();
    await this.submitReferralBtn.click();
  }

  async enterCandidateEmail(email: string): Promise<void> {
    await this.candidateEmailInput.fill(email);
  }

  async verifyDuplicateReferralBlocked(): Promise<void> {
    await expect(this.duplicateReferralWarning).toBeVisible({ timeout: 15000 });
    await expect(this.submitReferralBtn).toBeDisabled();
  }

  async verifyReferralSubmissionSuccess(): Promise<void> {
    const successToast = this.page
      .locator('[role="status"], [data-sonner-toast], .sonner-toast')
      .filter({ hasText: /success|submitted/i })
      .last();
    await expect(successToast).toBeVisible({ timeout: 20000 });
  }

  async verifyRequiredFieldErrors(fieldLabels: string[]): Promise<void> {
    for (const field of fieldLabels) {
      const error = this.page
        .locator(`text=/${this.escapeTextPattern(field)}.*(is required|required|cannot be empty|empty)/i`)
        .first();
      await expect(error).toBeVisible({ timeout: 5000 });
    }
  }

  private escapeTextPattern(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async selectOptionFromComboboxPlaceholder(
    placeholderText: string
  ): Promise<void> {
    const combobox = this.page
      .locator('[role="combobox"]')
      .filter({ hasText: new RegExp(this.escapeTextPattern(placeholderText), "i") })
      .first();

    await combobox.click();

    const listbox = this.page.locator('[role="listbox"]');
    await expect(listbox.first()).toBeVisible({ timeout: 10000 });

    const option = listbox.first().getByRole("option").first();
    await option.click();
  }
}