import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: false, // Sequentieel vanwege gedeelde Supabase DB
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:8080',
    storageState: 'tests/e2e/.auth/user.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
