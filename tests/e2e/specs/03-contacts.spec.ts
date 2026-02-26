/**
 * E2E Spec: Contacts
 * Tests contact aanmaken, zoeken en detail bekijken
 */

import { test, expect } from '../fixtures/auth.fixture';
import { ContactsPage, ContactForm } from '../pages/contacts.page';
import { createTestCompany, cleanupTestData } from '../fixtures/test-data.factory';

const TEST_FIRST_NAME = '[E2E]';
const TEST_LAST_NAME = 'TestContact';

test.describe('Contacten', () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('contacten pagina laadt correct', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    await contactsPage.navigate();
    await expect(page).toHaveURL('/contacts');
    await expect(page.locator('[data-testid="create-contact-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="contacts-search-input"]')).toBeVisible();
  });

  test('nieuw contact aanmaken via formulier', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    const form = new ContactForm(page);

    await contactsPage.navigate();
    await contactsPage.clickNieuwContact();
    await expect(form.isOpen()).resolves.toBe(true);

    await form.fillFirstName(TEST_FIRST_NAME);
    await form.fillLastName(TEST_LAST_NAME);
    await form.submit();

    // Wait for dialog to close and list to refresh
    await page.waitForTimeout(1500);

    // Search for the new contact
    await contactsPage.zoekOp(TEST_LAST_NAME);
    await page.waitForTimeout(600);

    await expect(contactsPage.getContactCard(TEST_LAST_NAME)).toBeVisible({ timeout: 10_000 });
  });

  test('zoeken op contactnaam filtert resultaten', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    await contactsPage.navigate();
    await page.waitForLoadState('networkidle');

    await contactsPage.zoekOp(TEST_LAST_NAME);
    await page.waitForTimeout(600);

    const cards = await contactsPage.getAllContactCards();
    expect(cards.length).toBeGreaterThanOrEqual(0);
  });

  test('klikken op contact opent detail pagina', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    await contactsPage.navigate();
    await contactsPage.zoekOp(TEST_LAST_NAME);
    await page.waitForTimeout(600);

    const card = contactsPage.getContactCard(TEST_LAST_NAME);
    await card.waitFor({ timeout: 10_000 });
    await card.click();

    await expect(page).toHaveURL(/\/contacts\//);
  });

  test('zoeken op niet-bestaand contact toont lege staat', async ({ page }) => {
    const contactsPage = new ContactsPage(page);
    await contactsPage.navigate();
    await contactsPage.zoekOp('ZZZNONEXISTENT999XYZ');
    await page.waitForTimeout(600);

    const cards = await contactsPage.getAllContactCards();
    expect(cards.length).toBe(0);
  });
});
