import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  const authDir = path.join('tests', 'e2e', '.auth');
  fs.mkdirSync(authDir, { recursive: true });

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL en TEST_USER_PASSWORD moeten ingesteld zijn in .env.test'
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8080/auth');

  // Vul inloggegevens in
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');

  // Wacht op redirect naar dashboard (na loading screen)
  await page.waitForURL(/\/(dashboard|companies|pipeline)/, { timeout: 15_000 });

  // Sla sessie op
  await page.context().storageState({
    path: path.join(authDir, 'user.json'),
  });

  await browser.close();
  console.log('✅ E2E auth sessie opgeslagen');
}
