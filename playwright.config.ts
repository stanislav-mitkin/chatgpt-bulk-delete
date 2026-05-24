import { defineConfig } from '@playwright/test';

// ⚠️  Run sparingly — frequent test runs may trigger ChatGPT bot detection / CAPTCHA.
// Setup once: pnpm auth  →  then: pnpm test (only when selectors need verification)
export default defineConfig({
  testDir: './tests',
  testMatch: '**/selectors.test.ts',  // auth-setup runs only via pnpm auth
  timeout: 120_000,
  retries: 0,         // never auto-retry — each run is a real network request
  workers: 1,         // serial only, no parallel tabs
  reporter: 'list',
  use: {
    headless: false,  // headed = real browser fingerprint, lower CAPTCHA risk
    screenshot: 'only-on-failure',
    // Human-like delays between actions
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
});
