/**
 * Run once before tests to save a logged-in ChatGPT session.
 *
 *   pnpm playwright test tests/auth-setup.ts
 *
 * Chrome opens, log in manually, then close the browser window.
 * Session is saved in test-profile/ and reused by all other tests.
 */
import { test, chromium } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const PROFILE_DIR = path.resolve(__dirname, '../test-profile');

test('save auth session', async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  const page = await ctx.newPage();
  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

  console.log('\n──────────────────────────────────────────────────');
  console.log('👉  Log in to ChatGPT in the browser window.');
  console.log('    When you see your chat list, close the window.');
  console.log('──────────────────────────────────────────────────\n');

  // Wait until the browser window is closed by the user
  await ctx.waitForEvent('close', { timeout: 300_000 });

  console.log('✓ Session saved to test-profile/');
});
