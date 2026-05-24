import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/selectors.test.ts',  // auth-setup runs only via pnpm auth
  timeout: 120_000,
  retries: 0,
  workers: 1,             // extension tests must run serially
  reporter: 'list',
  use: {
    headless: false,
    screenshot: 'only-on-failure',
  },
});
