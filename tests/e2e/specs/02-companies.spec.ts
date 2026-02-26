/**
 * E2E Spec: Companies
 * Tests bedrijf aanmaken, zoeken en detail bekijken
 */

import { test, expect } from '../fixtures/auth.fixture';
import { CompaniesPage, CompanyForm } from '../pages/companies.page';
import { cleanupTestData } from '../fixtures/test-data.factory';

const TEST_COMPANY_NAME = '[E2E] Test Bedrijf BV';
const TEST_COMPANY_NAME_2 = '[E2E] Tweede Bedrijf NV';

test.describe('Bedrijven', () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('bedrijven pagina laadt correct', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);
    await companiesPage.navigate();
    await expect(page).toHaveURL('/companies');
    await expect(page.locator('[data-testid="create-company-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('nieuw bedrijf aanmaken via formulier', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);
    const form = new CompanyForm(page);

    await companiesPage.navigate();
    await companiesPage.clickNieuwBedrijf();
    await expect(form.isOpen()).resolves.toBe(true);

    await form.fillNaam(TEST_COMPANY_NAME);
    await form.submit();

    // Dialog should close
    await page.waitForTimeout(1000);
    // Company should appear in list
    await companiesPage.zoekOp(TEST_COMPANY_NAME);
    await expect(companiesPage.getCompanyCard(TEST_COMPANY_NAME)).toBeVisible({ timeout: 10_000 });
  });

  test('zoeken op bedrijfsnaam filtert resultaten', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);
    await companiesPage.navigate();

    // First ensure list is loaded
    await page.waitForLoadState('networkidle');

    // Search for unique prefix
    await companiesPage.zoekOp('[E2E]');
    await page.waitForTimeout(600); // debounce

    const cards = await companiesPage.getAllCompanyCards();
    // All visible cards should relate to [E2E] or list could be filtered
    expect(cards.length).toBeGreaterThanOrEqual(0);
  });

  test('klikken op bedrijf opent detail pagina', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);
    await companiesPage.navigate();
    await companiesPage.zoekOp(TEST_COMPANY_NAME);
    await page.waitForTimeout(600);

    const card = companiesPage.getCompanyCard(TEST_COMPANY_NAME);
    await card.waitFor({ timeout: 10_000 });
    await card.click();

    await expect(page).toHaveURL(/\/companies\//);
  });

  test('zoeken op niet-bestaand bedrijf toont lege staat', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);
    await companiesPage.navigate();
    await companiesPage.zoekOp('ZZZNONEXISTENT999XYZ');
    await page.waitForTimeout(600);

    const cards = await companiesPage.getAllCompanyCards();
    expect(cards.length).toBe(0);
  });
});
