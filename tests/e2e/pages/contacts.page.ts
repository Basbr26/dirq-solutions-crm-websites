import { Page, Locator } from '@playwright/test';

export class ContactsPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/contacts');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNieuwContact() {
    await this.page.click('[data-testid="create-contact-btn"]');
  }

  async zoekOp(query: string) {
    await this.page.fill('[data-testid="contacts-search-input"]', query);
    await this.page.waitForTimeout(600);
  }

  getContactCard(naam: string): Locator {
    return this.page.locator(`[data-testid="contact-card"]:has-text("${naam}")`);
  }

  getAllContactCards(): Locator {
    return this.page.locator('[data-testid="contact-card"]');
  }
}

export class ContactForm {
  constructor(private page: Page) {}

  async fillNaam(naam: string) {
    await this.page.fill('[data-testid="contact-name-input"]', naam);
  }

  async fillEmail(email: string) {
    await this.page.fill('[data-testid="contact-email-input"]', email);
  }

  async submit() {
    await this.page.click('[data-testid="contact-submit-btn"]');
  }
}
