/**
 * Run once to save a logged-in ChatGPT session.
 *
 *   pnpm auth
 *
 * Real Chrome opens (not Playwright Chromium), log in, then close the window.
 * Session is saved in test-profile/ and reused by all other tests.
 */
import { test } from '@playwright/test';
import { launchRealChrome, PROFILE_DIR, CHATGPT_URL } from './browser-helper';

test('save auth session', async () => {
  const ctx = await launchRealChrome(PROFILE_DIR);
  const page = await ctx.newPage();
  await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });

  console.log('\n──────────────────────────────────────────────────');
  console.log('👉  Log in to ChatGPT in the browser window.');
  console.log('    When you see your chat list, close the window.');
  console.log('──────────────────────────────────────────────────\n');

  await ctx.waitForEvent('close', { timeout: 300_000 });

  console.log('✓ Session saved to test-profile/');
});
