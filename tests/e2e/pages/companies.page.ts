import { Page, Locator } from '@playwright/test';

export class CompaniesPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/companies');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNieuwBedrijf() {
    await this.page.click('[data-testid="create-company-btn"]');
  }

  async zoekOp(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    // Wacht op debounce (500ms)
    await this.page.waitForTimeout(600);
  }

  async clearSearch() {
    await this.page.fill('[data-testid="search-input"]', '');
    await this.page.waitForTimeout(600);
  }

  getCompanyCard(naam: string): Locator {
    return this.page.locator(`[data-testid="company-card"]:has-text("${naam}")`);
  }

  getAllCompanyCards(): Locator {
    return this.page.locator('[data-testid="company-card"]');
  }
}

export class CompanyForm {
  constructor(private page: Page) {}

  async fillNaam(naam: string) {
    await this.page.fill('[data-testid="company-name-input"]', naam);
  }

  async submit() {
    await this.page.click('[data-testid="company-submit-btn"]');
  }

  async isOpen(): Promise<boolean> {
    return this.page.locator('[data-testid="company-name-input"]').isVisible();
  }
}
