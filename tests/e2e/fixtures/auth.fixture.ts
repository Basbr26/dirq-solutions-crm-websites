import { test as base } from '@playwright/test';

// storageState wordt globaal geladen via playwright.config.ts
// Deze fixture biedt een extensiepunt voor toekomstige per-test auth logica
export const test = base.extend({});
export { expect } from '@playwright/test';
