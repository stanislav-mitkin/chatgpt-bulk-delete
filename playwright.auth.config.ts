import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: '**/auth-setup.ts',
  timeout: 300_000,
  workers: 1,
  reporter: 'list',
});
