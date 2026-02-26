import { Page, Locator } from '@playwright/test';

export class PipelinePage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/pipeline');
    await this.page.waitForLoadState('networkidle');
  }

  getStageColumn(stageName: string): Locator {
    return this.page.locator(`[data-testid="pipeline-stage-${stageName}"]`);
  }

  getProjectCard(titel: string): Locator {
    return this.page.locator(`[data-testid="project-card"]:has-text("${titel}")`);
  }

  getAllProjectCards(): Locator {
    return this.page.locator('[data-testid="project-card"]');
  }
}
