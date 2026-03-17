import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface RequisitionData {
  jobTitle: string;
  department: string;
  hiringType: string;
  stream: string;
  designation: string;
  location: string;
  workMode: string;
  employmentType: string;
  duration: string;
  headcount: string;
  minimumExperience: string;
  maximumExperience: string;
  urgency: string;
  client: string;
  project: string;
  jobDescription: string;
  ctcMin?: string;
  ctcMax?: string;
  hourlyBillingRate?: string;
}

/**
 * Page Object for the Create / Edit Requisition form dialog.
 */
export class RequisitionFormPage extends BasePage {
  // ── Locators ────────────────────────────────────────────────

  private readonly formCard = this.page.getByTestId("card-requisition-form");
  private readonly jobTitleInput = this.page.locator("#roleTitle");
  private readonly headcountInput = this.page.getByTestId("input-headcount");
  private readonly minExperienceInput = this.page.getByTestId(
    "input-minimum-experience"
  );
  private readonly maxExperienceInput = this.page.getByTestId(
    "input-maximum-experience"
  );
  private readonly jobDescriptionEditor = this.page.locator(".ql-editor");
  private readonly submitBtn = this.page.getByTestId(
    "button-submit-requisition"
  );
  private readonly saveDraftBtn = this.page.getByTestId("button-save-draft");
  private readonly ctcMinInput = this.page.getByTestId("input-ctc-min");
  private readonly ctcMaxInput = this.page.getByTestId("input-ctc-max");
  private readonly hourlyRateInput = this.page.getByTestId(
    "input-hourly-billing-rate"
  );

  private readonly SELECTS = {
    department: "select-department",
    hiringType: "select-hiring-type",
    stream: "select-stream",
    designation: "select-designation",
    location: "select-location",
    workMode: "select-work-mode",
    employmentType: "select-employment-type",
    duration: "select-duration",
    urgency: "select-urgency",
    client: "select-client",
    project: "select-project",
  } as const;

  // ── Assertions ──────────────────────────────────────────────

  async verifyFormVisible(): Promise<void> {
    await expect(this.formCard).toBeVisible({ timeout: 15000 });
  }

  async verifySubmissionSuccess(): Promise<void> {
    const toast = this.page.getByText(
      /submitted for approval successfully|saved as draft successfully/i
    ).first();
    await expect(toast).toBeVisible({ timeout: 20000 });
  }

  async verifyValidationError(message: string): Promise<void> {
    const toast = this.page.locator(`text=/${message}/i`).first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  }

  // ── Individual field helpers ────────────────────────────────

  async fillJobTitle(title: string): Promise<void> {
    await this.fillInput(this.jobTitleInput, title);
  }

  async selectDepartment(department: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.department, department);
    await this.page.waitForTimeout(2000);
    await this.waitForNetworkIdle();
  }

  async selectHiringType(type: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.hiringType, type);
  }

  async selectStream(stream: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.stream, stream);
  }

  async selectDesignation(designation: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.designation, designation);
  }

  async selectLocation(location: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.location, location);
    await this.page.waitForTimeout(500);
  }

  async selectWorkMode(workMode: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.workMode, workMode);
  }

  async selectEmploymentType(type: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.employmentType, type);
  }

  async selectDuration(duration: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.duration, duration);
  }

  async fillHeadcount(count: string): Promise<void> {
    await this.fillInput(this.headcountInput, count);
  }

  async fillMinExperience(years: string): Promise<void> {
    await this.fillInput(this.minExperienceInput, years);
  }

  async fillMaxExperience(years: string): Promise<void> {
    await this.fillInput(this.maxExperienceInput, years);
  }

  async selectPriority(priority: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.urgency, priority);
  }

  async selectClient(client: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.client, client);
    await this.page.waitForTimeout(2000);
    await this.waitForNetworkIdle();
  }

  async selectProject(project: string): Promise<void> {
    await this.selectDropdownByTestId(this.SELECTS.project, project);
  }

  async fillJobDescription(description: string): Promise<void> {
    await this.jobDescriptionEditor.waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.jobDescriptionEditor.click();
    await this.jobDescriptionEditor.fill(description);
  }

  async fillCTCRange(min: string, max: string): Promise<void> {
    if (await this.isElementVisible(this.ctcMinInput, 3000)) {
      await this.fillInput(this.ctcMinInput, min);
      await this.fillInput(this.ctcMaxInput, max);
    }
  }

  async fillHourlyRate(rate: string): Promise<void> {
    if (await this.isElementVisible(this.hourlyRateInput, 3000)) {
      await this.fillInput(this.hourlyRateInput, rate);
    }
  }

  // ── Composite: data-driven form fill ──────────────────────

  async fillRequisitionForm(data: RequisitionData): Promise<void> {
    await this.verifyFormVisible();
    await this.formCard.scrollIntoViewIfNeeded();

    await this.fillJobTitle(data.jobTitle);
    await this.selectDepartment(data.department);
    await this.selectHiringType(data.hiringType);
    await this.selectStream(data.stream);
    await this.selectDesignation(data.designation);
    await this.selectLocation(data.location);
    await this.selectWorkMode(data.workMode);

    if (data.employmentType)
      await this.selectEmploymentType(data.employmentType);
    if (data.duration) await this.selectDuration(data.duration);

    await this.fillHeadcount(data.headcount);

    if (data.minimumExperience)
      await this.fillMinExperience(data.minimumExperience);
    if (data.maximumExperience)
      await this.fillMaxExperience(data.maximumExperience);
    if (data.urgency) await this.selectPriority(data.urgency);

    if (data.location === "Onsite" && data.hourlyBillingRate) {
      await this.fillHourlyRate(data.hourlyBillingRate);
    } else if (
      (data.location === "Noida" || data.location === "Remote") &&
      data.ctcMin &&
      data.ctcMax
    ) {
      await this.fillCTCRange(data.ctcMin, data.ctcMax);
    }

    if (data.client) await this.selectClient(data.client);
    if (data.project) await this.selectProject(data.project);

    if (data.jobDescription) {
      await this.jobDescriptionEditor.scrollIntoViewIfNeeded();
      await this.fillJobDescription(data.jobDescription);
    }
  }

  // ── Submit actions ──────────────────────────────────────────

  async submitForApproval(): Promise<void> {
    await this.submitBtn.scrollIntoViewIfNeeded();
    await this.clickElement(this.submitBtn);
  }

  async saveAsDraft(): Promise<void> {
    await this.saveDraftBtn.scrollIntoViewIfNeeded();
    await this.clickElement(this.saveDraftBtn);
  }
}
