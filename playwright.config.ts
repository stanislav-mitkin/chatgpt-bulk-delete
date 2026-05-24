import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/selectors.test.ts',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  webServer: {
    // Serve fixtures/ on localhost:3333 so the extension content script can inject
    command: 'python3 -m http.server 3333 --directory tests/fixtures',
    url: 'http://localhost:3333',
    reuseExistingServer: true,
    timeout: 5_000,
  },
  use: {
    headless: false,
    screenshot: 'only-on-failure',
  },
});
