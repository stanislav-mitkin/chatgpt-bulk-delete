import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,       // long — user may need to log in
  retries: 0,
  workers: 1,             // extension tests must run serially
  reporter: 'list',
  use: {
    headless: false,
    screenshot: 'only-on-failure',
  },
});
