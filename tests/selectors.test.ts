import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const MOCK_PAGE = 'http://localhost:3333/chatgpt-mock.html';
const REAL_PAGE = 'http://localhost:3333/ChatGPT.html';

async function launch(): Promise<BrowserContext> {
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
    expect(true).toBe(true);
    await page.close();
  });

  test('primary selector finds all 10 mock chats via data-sidebar-item', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForSelector('nav');
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const primary = document.querySelectorAll('nav[aria-label="Chat history"] a[data-sidebar-item="true"]');
      const fallback = document.querySelectorAll('nav a[href*="/c/"], aside a[href*="/c/"]');
      return {
        primaryCount: primary.length,
        fallbackCount: fallback.length,
        ids: Array.from(primary).map((el) => el.getAttribute('href')),
      };
    });

    console.log(`\nPrimary (data-sidebar-item): ${result.primaryCount} chats`);
    console.log(`Fallback (href*=/c/):         ${result.fallbackCount} chats`);

    expect(result.primaryCount).toBe(10);
    await page.close();
  });

  test('real ChatGPT HTML — selectors find saved chats', async () => {
    const page = await ctx.newPage();
    await page.goto(REAL_PAGE);
    await page.waitForSelector('nav', { timeout: 5_000 });
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
      // Precise selector: data-sidebar-item + href contains /c/ (excludes Home/Projects/etc.)
      const primary = document.querySelectorAll('nav[aria-label="Chat history"] a[data-sidebar-item="true"][href*="/c/"]');
      const fallback = document.querySelectorAll('nav a[href*="/c/"], aside a[href*="/c/"]');
      const titles = Array.from(primary).map((el) =>
        el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40)
      );
      return {
        primaryCount: primary.length,
        fallbackCount: fallback.length,
        navLabels: Array.from(document.querySelectorAll('nav')).map((n) => n.getAttribute('aria-label')),
        titles: titles.slice(0, 5),
      };
    });

    console.log('\n── Real ChatGPT HTML ─────────────────────────────');
    console.log(`nav aria-labels:                   ${JSON.stringify(result.navLabels)}`);
    console.log(`Primary (data-sidebar-item+/c/):   ${result.primaryCount} chats`);
    console.log(`Fallback (href*=/c/):               ${result.fallbackCount} chats`);
    console.log(`Titles: ${JSON.stringify(result.titles)}`);
    console.log('──────────────────────────────────────────────────\n');

    expect(result.primaryCount, 'Should find chats in saved ChatGPT page').toBeGreaterThan(0);
    await page.close();
  });

  test('Cmd+Shift+X shows overlay, Esc hides it (even from textarea)', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(300);

    const visibleAfterHotkey = await page.evaluate(() => {
      const panel = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel');
      return !panel?.classList.contains('hidden');
    });
    expect(visibleAfterHotkey, 'Panel visible after Cmd+Shift+X').toBe(true);

    await page.locator('textarea').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const hiddenAfterEsc = await page.evaluate(() => {
      const panel = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel');
      return panel?.classList.contains('hidden');
    });
    expect(hiddenAfterEsc, 'Panel hidden after Esc from textarea').toBe(true);
    await page.close();
  });

  test('J/K moves cursor, Space selects, count updates', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(200);

    const firstHref = await page.evaluate(() => document.querySelector('a.cbd-cursor')?.getAttribute('href'));
    expect(firstHref).toContain('/c/aaa-');

    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    const secondHref = await page.evaluate(() => document.querySelector('a.cbd-cursor')?.getAttribute('href'));
    expect(secondHref).toContain('/c/bbb-');

    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const count = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(count, 'Count badge shows 1').toBe('1');

    const isSelected = await page.evaluate(() =>
      document.querySelector('a[href*="/c/ccc-"]')?.classList.contains('cbd-selected')
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
    const countClear = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count')?.textContent
    );
    expect(countClear, 'Cmd+D clears').toBe('0');
    await page.close();
  });
});
