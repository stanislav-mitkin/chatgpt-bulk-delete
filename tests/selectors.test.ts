import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const MOCK_PAGE = 'http://localhost:3333/chatgpt-mock.html';

async function launch(): Promise<BrowserContext> {
  // Use Playwright Chromium (not real Chrome) — no Google login needed for mock tests
  return chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
}

test.describe('Extension on mock ChatGPT page', () => {
  let ctx: BrowserContext;

  test.beforeAll(async () => { ctx = await launch(); });
  test.afterAll(async () => { await ctx.close(); });
  test.afterEach(async () => { await new Promise((r) => setTimeout(r, 300)); });

  test('content script injects styles and overlay', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForSelector('nav');

    await page.waitForFunction(() => !!document.getElementById('cbd-styles'), { timeout: 5_000 });
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });

    const styleInjected = await page.evaluate(() => !!document.getElementById('cbd-styles'));
    const overlayInjected = await page.evaluate(() => !!document.getElementById('cbd-overlay-host'));

    expect(styleInjected).toBe(true);
    expect(overlayInjected).toBe(true);
    await page.close();
  });

  test('selectors find all 10 mock chats', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForSelector('nav');
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const primary = document.querySelectorAll('nav a[href^="/c/"], aside a[href^="/c/"]');
      const fallback = document.querySelectorAll('a[href^="/c/"]');
      return {
        primaryCount: primary.length,
        fallbackCount: fallback.length,
        ids: Array.from(primary).map((el) => el.getAttribute('href')),
      };
    });

    console.log(`\nPrimary selector: ${result.primaryCount} chats`);
    console.log(`Fallback selector: ${result.fallbackCount} chats`);
    console.log('IDs:', result.ids);

    expect(result.primaryCount).toBe(10);
    await page.close();
  });

  test('Cmd+Shift+X shows overlay, Esc hides it', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    // Enter selection mode
    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(300);

    const visibleAfterHotkey = await page.evaluate(() => {
      const panel = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel');
      return !panel?.classList.contains('hidden');
    });
    expect(visibleAfterHotkey, 'Panel visible after Cmd+Shift+X').toBe(true);

    // Esc hides it — even from textarea
    await page.locator('textarea').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const hiddenAfterEsc = await page.evaluate(() => {
      const panel = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel');
      return panel?.classList.contains('hidden');
    });
    expect(hiddenAfterEsc, 'Panel hidden after Esc (from textarea)').toBe(true);

    await page.close();
  });

  test('J/K moves cursor, Space selects, count updates', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(200);

    // First chat should have cursor
    const firstHref = await page.evaluate(() => document.querySelector('a.cbd-cursor')?.getAttribute('href'));
    expect(firstHref).toBe('/c/aaa-111');

    // Move down
    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    const secondHref = await page.evaluate(() => document.querySelector('a.cbd-cursor')?.getAttribute('href'));
    expect(secondHref).toBe('/c/bbb-222');

    // Move down again
    await page.keyboard.press('j');
    await page.waitForTimeout(100);

    // Select current (3rd chat)
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const count = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(count, 'Count badge shows 1 after Space').toBe('1');

    const isSelected = await page.evaluate(() =>
      document.querySelector('a[href="/c/ccc-333"]')?.classList.contains('cbd-selected')
    );
    expect(isSelected, 'Third chat has cbd-selected class').toBe(true);

    await page.close();
  });

  test('Shift+J range-selects multiple chats', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(200);

    // Shift+J x3 from position 0 → should select chats 0,1,2,3
    await page.keyboard.press('Shift+j');
    await page.keyboard.press('Shift+j');
    await page.keyboard.press('Shift+j');
    await page.waitForTimeout(200);

    const count = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(count, 'Range select: 4 chats selected').toBe('4');

    await page.close();
  });

  test('Cmd+A selects all, Cmd+D clears', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(200);

    await page.keyboard.press('Meta+a');
    await page.waitForTimeout(100);

    const countAll = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(countAll, 'Cmd+A selects all 10').toBe('10');

    await page.keyboard.press('Meta+d');
    await page.waitForTimeout(100);

    const countAfterClear = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(countAfterClear, 'Cmd+D clears selection').toBe('0');

    await page.close();
  });
});
