import { Page, Locator } from '@playwright/test';

export class QuotesPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/quotes');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNieuweOfferte() {
    await this.page.click('[data-testid="create-quote-btn"]');
  }

  async zoekOp(query: string) {
    await this.page.fill('[data-testid="quotes-search-input"]', query);
    await this.page.waitForTimeout(600);
  }

  getQuoteRow(nummer: string): Locator {
    return this.page.locator(`[data-testid="quote-row"]:has-text("${nummer}")`);
  }

  getAllQuoteRows(): Locator {
    return this.page.locator('[data-testid="quote-row"]');
  }
}
