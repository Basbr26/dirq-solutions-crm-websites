/**
 * E2E Spec: Role-Based Access Control
 * Tests dat de ingelogde testgebruiker de juiste routes kan bereiken
 * en dat beveiligde routes correct redirect
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Rol-gebaseerde toegang', () => {
  test('ingelogde gebruiker kan /companies bereiken', async ({ page }) => {
    await page.goto('/companies');
    await expect(page).toHaveURL('/companies');
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('ingelogde gebruiker kan /contacts bereiken', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page).toHaveURL('/contacts');
  });

  test('ingelogde gebruiker kan /pipeline bereiken', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveURL('/pipeline');
  });

  test('ingelogde gebruiker kan /quotes bereiken', async ({ page }) => {
    await page.goto('/quotes');
    await expect(page).toHaveURL('/quotes');
  });

  test('ingelogde gebruiker kan /interactions bereiken', async ({ page }) => {
    await page.goto('/interactions');
    await expect(page).toHaveURL('/interactions');
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('niet-bestaande route toont 404 of redirect naar app', async ({ page }) => {
    await page.goto('/deze-route-bestaat-niet');
    // Either shows 404 page or redirects to a valid route
    const url = page.url();
    expect(url).not.toContain('/auth');
  });

  test('sessie blijft bewaard bij page reload', async ({ page }) => {
    await page.goto('/companies');
    await page.reload();
    // After reload, should still be on companies (not redirected to /auth)
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('navigatie header is zichtbaar op alle paginas', async ({ page }) => {
    const routes = ['/companies', '/contacts', '/pipeline', '/quotes'];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10_000 });
    }
  });
});
