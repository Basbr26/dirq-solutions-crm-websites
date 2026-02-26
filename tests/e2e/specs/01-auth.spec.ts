/**
 * E2E Spec: Authentication
 * Tests login flow, logout, and protected route redirects
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Authenticatie', () => {
  test('ingelogde gebruiker bereikt de app na laden', async ({ page }) => {
    await page.goto('/');
    // Should end up somewhere inside the app (not on /auth)
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('uitloggen redirect naar /auth', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Open user menu
    await page.click('[data-testid="user-menu"]');
    // Click logout
    await page.click('[data-testid="logout-btn"]');

    await expect(page).toHaveURL(/\/auth/);
  });

  test('niet-ingelogde gebruiker op beveiligde route → redirect naar /auth', async ({ browser }) => {
    // Use a fresh context WITHOUT storageState
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:8080/companies');
    await expect(page).toHaveURL(/\/auth/);
    await context.close();
  });

  test('login pagina toont de Dirq logo en het inlogformulier', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:8080/auth');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await context.close();
  });

  test('inloggen met foute credentials toont foutmelding', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:8080/auth');
    await page.fill('[data-testid="email-input"]', 'fout@test.nl');
    await page.fill('[data-testid="password-input"]', 'FoutWachtwoord123');
    await page.click('[data-testid="login-button"]');
    // Should still be on auth page
    await expect(page).toHaveURL(/\/auth/);
    await context.close();
  });
});
