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

async function waitForOverlay(page: Parameters<typeof page.waitForFunction>[1] extends never ? never : import('@playwright/test').Page) {
  await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
  await page.waitForTimeout(400);
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

  test('idle hint is visible before activation', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    const hintVisible = await page.evaluate(() => {
      const hint = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.hint');
      return hint && !hint.classList.contains('hidden');
    });
    expect(hintVisible, 'Idle hint should be visible').toBe(true);
    await page.close();
  });

  test('primary selector finds all 10 mock chats', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await page.waitForSelector('nav');
    await page.waitForTimeout(800);

    const count = await page.evaluate(() =>
      document.querySelectorAll('nav[aria-label="Chat history"] a[data-sidebar-item="true"][href*="/c/"]').length
    );
    expect(count).toBe(10);
    await page.close();
  });

  test('real ChatGPT HTML — selectors find saved chats', async () => {
    const page = await ctx.newPage();
    await page.goto(REAL_PAGE);
    await page.waitForSelector('nav', { timeout: 5_000 });
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
      const primary = document.querySelectorAll(
        'nav[aria-label="Chat history"] a[data-sidebar-item="true"][href*="/c/"]'
      );
      return {
        count: primary.length,
        titles: Array.from(primary).map((el) => el.getAttribute('aria-label')).slice(0, 5),
      };
    });

    console.log(`\nReal ChatGPT HTML: ${result.count} chats — ${JSON.stringify(result.titles)}\n`);
    expect(result.count).toBeGreaterThan(0);
    await page.close();
  });

  test('Cmd+Shift+K activates — hint hides, panel appears', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    await page.keyboard.press('Meta+Shift+K');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const sr = document.getElementById('cbd-overlay-host')?.shadowRoot;
      return {
        hintHidden: sr?.querySelector('.hint')?.classList.contains('hidden'),
        panelVisible: !sr?.querySelector('.panel')?.classList.contains('hidden'),
        countText: sr?.querySelector('.count-badge')?.textContent,
      };
    });

    expect(state.hintHidden,   'Hint hides when active').toBe(true);
    expect(state.panelVisible, 'Panel shows when active').toBe(true);
    expect(state.countText,    'Initial count text').toBe('0 chats selected');
    await page.close();
  });

  test('Esc exits — even when textarea is focused', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    await page.keyboard.press('Meta+Shift+K');
    await page.waitForTimeout(200);

    await page.locator('textarea').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const panelHidden = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel')?.classList.contains('hidden')
    );
    expect(panelHidden, 'Panel hides after Esc from textarea').toBe(true);
    await page.close();
  });

  test('hover + Space selects chat, count shows "1 chat selected"', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    await page.keyboard.press('Meta+Shift+K');
    await page.waitForTimeout(200);

    // Hover first chat
    await page.hover('a[href*="/c/aaa-"]');
    await page.waitForTimeout(100);

    const hasHover = await page.evaluate(() =>
      document.querySelector('a[href*="/c/aaa-"]')?.classList.contains('cbd-hover')
    );
    expect(hasHover, 'Hovered chat has cbd-hover class').toBe(true);

    // Space selects it
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const countText = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count-badge')?.textContent
    );
    expect(countText, 'Count badge after Space').toBe('1 chat selected');

    const isSelected = await page.evaluate(() =>
      document.querySelector('a[href*="/c/aaa-"]')?.classList.contains('cbd-selected')
    );
    expect(isSelected, 'Chat has cbd-selected class').toBe(true);
    await page.close();
  });

  test('click selects chat (prevents navigation)', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    await page.keyboard.press('Meta+Shift+K');
    await page.waitForTimeout(200);

    await page.click('a[href*="/c/bbb-"]');
    await page.waitForTimeout(200);

    const isSelected = await page.evaluate(() =>
      document.querySelector('a[href*="/c/bbb-"]')?.classList.contains('cbd-selected')
    );
    // Still on mock page (navigation was prevented)
    expect(page.url()).toContain('chatgpt-mock.html');
    expect(isSelected, 'Clicked chat is selected').toBe(true);
    await page.close();
  });

  test('Cmd+A selects all 10, Cmd+D clears', async () => {
    const page = await ctx.newPage();
    await page.goto(MOCK_PAGE);
    await waitForOverlay(page);

    await page.keyboard.press('Meta+Shift+K');
    await page.waitForTimeout(200);

    await page.keyboard.press('Meta+a');
    await page.waitForTimeout(100);
    const countAll = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count-badge')?.textContent
    );
    expect(countAll).toBe('10 chats selected');

    await page.keyboard.press('Meta+d');
    await page.waitForTimeout(100);
    const countClear = await page.evaluate(() =>
      document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.count-badge')?.textContent
    );
    expect(countClear).toBe('0 chats selected');
    await page.close();
  });
});
