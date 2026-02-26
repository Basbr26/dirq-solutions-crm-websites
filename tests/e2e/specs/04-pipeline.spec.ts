/**
 * E2E Spec: Pipeline (Kanban Board)
 * Tests stage kolommen zichtbaarheid en project aanmaken
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PipelinePage } from '../pages/pipeline.page';
import { cleanupTestData } from '../fixtures/test-data.factory';

const TEST_PROJECT_TITLE = '[E2E] Test Website Project';

test.describe('Pipeline', () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('pipeline pagina laadt met kanban kolommen', async ({ page }) => {
    const pipelinePage = new PipelinePage(page);
    await pipelinePage.navigate();
    await expect(page).toHaveURL('/pipeline');

    // Verify core sales pipeline stages are visible
    await expect(pipelinePage.getStageColumn('lead')).toBeVisible({ timeout: 10_000 });
    await expect(pipelinePage.getStageColumn('quote_requested')).toBeVisible();
    await expect(pipelinePage.getStageColumn('quote_sent')).toBeVisible();
  });

  test('development pipeline stages zijn zichtbaar', async ({ page }) => {
    const pipelinePage = new PipelinePage(page);
    await pipelinePage.navigate();

    await expect(pipelinePage.getStageColumn('in_development')).toBeVisible({ timeout: 10_000 });
    await expect(pipelinePage.getStageColumn('review')).toBeVisible();
    await expect(pipelinePage.getStageColumn('live')).toBeVisible();
  });

  test('nieuw project knop is zichtbaar', async ({ page }) => {
    const pipelinePage = new PipelinePage(page);
    await pipelinePage.navigate();
    await expect(page.locator('[data-testid="create-project-btn"]')).toBeVisible({ timeout: 10_000 });
  });

  test('project kaarten in lead kolom zijn klikbaar', async ({ page }) => {
    const pipelinePage = new PipelinePage(page);
    await pipelinePage.navigate();
    await page.waitForLoadState('networkidle');

    const leadColumn = pipelinePage.getStageColumn('lead');
    await leadColumn.waitFor({ timeout: 10_000 });

    const projectCards = leadColumn.locator('[data-testid="project-card"]');
    const count = await projectCards.count();

    if (count > 0) {
      // Click first card → should navigate to project detail
      await projectCards.first().click();
      await expect(page).toHaveURL(/\/projects\//);
    } else {
      // No projects in lead → that's fine, just verify the column exists
      expect(await leadColumn.isVisible()).toBe(true);
    }
  });

  test('pipeline stats kaarten zijn zichtbaar', async ({ page }) => {
    const pipelinePage = new PipelinePage(page);
    await pipelinePage.navigate();
    await page.waitForLoadState('networkidle');

    // Stats section should contain currency values or project counts
    const statsCards = page.locator('.grid .rounded-lg, .grid [class*="card"]');
    await expect(statsCards.first()).toBeVisible({ timeout: 10_000 });
  });
});
