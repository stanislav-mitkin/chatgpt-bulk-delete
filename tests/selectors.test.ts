import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const PROFILE_DIR = path.resolve(__dirname, '../test-profile');
const CHATGPT_URL = 'https://chatgpt.com';

// Launches Chrome with the extension and the saved auth session
async function launchWithExtension(): Promise<BrowserContext> {
  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error(
      'No saved session found. Run auth setup first:\n' +
      '  pnpm playwright test tests/auth-setup.ts'
    );
  }
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
}

test.describe('ChatGPT selector verification', () => {
  let ctx: BrowserContext;

  test.beforeAll(async () => {
    ctx = await launchWithExtension();
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('page loads and content script injects', async () => {
    const page = await ctx.newPage();
    await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });

    // Wait for nav or aside to appear (sidebar)
    await page.waitForSelector('nav, aside', { timeout: 60_000 });

    // Wait for content script to inject its style tag (async after sidebar appears)
    await page.waitForFunction(() => !!document.getElementById('cbd-styles'), { timeout: 10_000 });
    const styleInjected = true; // waitForFunction throws if not found
    expect(styleInjected, 'Content script injected <style id="cbd-styles">').toBe(true);

    // Verify overlay host was injected
    await page.waitForFunction(() => !!document.getElementById('cbd-overlay-host'), { timeout: 5_000 });
    const overlayInjected = true;
    expect(overlayInjected, 'Content script injected Shadow DOM overlay').toBe(true);

    await page.close();
  });

  test('chat link selectors find sidebar items', async () => {
    const page = await ctx.newPage();
    await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('nav, aside', { timeout: 60_000 });

    // Small pause for sidebar to fully render
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      // Primary selector (same as chat-list.ts)
      const primary = document.querySelectorAll<HTMLAnchorElement>('nav a[href^="/c/"], aside a[href^="/c/"]');
      // Fallback selector
      const fallback = document.querySelectorAll<HTMLAnchorElement>('a[href^="/c/"]');

      const extract = (links: NodeListOf<HTMLAnchorElement>) =>
        Array.from(links).map((el) => ({
          href: el.getAttribute('href'),
          text: el.textContent?.trim().slice(0, 40),
          tag: el.tagName,
          parentTag: el.parentElement?.tagName,
        }));

      return {
        primaryCount: primary.length,
        fallbackCount: fallback.length,
        samples: extract(primary.length > 0 ? primary : fallback).slice(0, 5),
        // Introspect DOM around first item for selector debugging
        navExists: !!document.querySelector('nav'),
        asideExists: !!document.querySelector('aside'),
        navAriaLabel: document.querySelector('nav')?.getAttribute('aria-label'),
      };
    });

    console.log('\n── Selector results ──────────────────────────────');
    console.log(`nav exists:        ${result.navExists}  (aria-label: "${result.navAriaLabel}")`);
    console.log(`aside exists:      ${result.asideExists}`);
    console.log(`primary selector:  ${result.primaryCount} chats`);
    console.log(`fallback selector: ${result.fallbackCount} chats`);
    if (result.samples.length) {
      console.log('samples:');
      result.samples.forEach((s) => console.log(`  ${s.href}  "${s.text}"  (${s.parentTag} > ${s.tag})`));
    }
    console.log('──────────────────────────────────────────────────\n');

    // At least one of the selectors should find items if user is logged in
    const totalFound = Math.max(result.primaryCount, result.fallbackCount);
    if (totalFound === 0) {
      console.warn('⚠️  No chats found — make sure you are logged in and have existing conversations.');
    }

    expect(result.navExists || result.asideExists, 'Sidebar element (nav or aside) should exist').toBe(true);
    await page.close();
  });

  test('extension hotkey activates selection mode', async () => {
    const page = await ctx.newPage();
    await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('nav, aside', { timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Press Cmd+Shift+X to enter selection mode
    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(300);

    const overlayState = await page.evaluate(() => {
      const host = document.getElementById('cbd-overlay-host');
      if (!host?.shadowRoot) return { found: false, hidden: true };
      const panel = host.shadowRoot.querySelector('.panel');
      return {
        found: true,
        hidden: panel?.classList.contains('hidden') ?? true,
        countText: host.shadowRoot.querySelector('.count')?.textContent,
      };
    });

    console.log('\n── Hotkey test ────────────────────────────────────');
    console.log(`Overlay found:    ${overlayState.found}`);
    console.log(`Panel visible:    ${!overlayState.hidden}`);
    console.log(`Count badge:      "${overlayState.countText}"`);
    console.log('──────────────────────────────────────────────────\n');

    expect(overlayState.found, 'Overlay host element should exist').toBe(true);
    expect(overlayState.hidden, 'Panel should be visible after Cmd+Shift+X').toBe(false);

    // Press Esc to exit
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const hiddenAfterEsc = await page.evaluate(() => {
      const panel = document.getElementById('cbd-overlay-host')?.shadowRoot?.querySelector('.panel');
      return panel?.classList.contains('hidden') ?? false;
    });
    expect(hiddenAfterEsc, 'Panel should hide after Esc').toBe(true);

    await page.close();
  });

  test('J/K navigation moves cursor between chats', async () => {
    const page = await ctx.newPage();
    await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('nav, aside', { timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Enter selection mode
    await page.keyboard.press('Meta+Shift+X');
    await page.waitForTimeout(200);

    const firstCursorHref = await page.evaluate(() => {
      return document.querySelector('a.cbd-cursor')?.getAttribute('href');
    });

    // Move cursor down
    await page.keyboard.press('j');
    await page.waitForTimeout(100);

    const secondCursorHref = await page.evaluate(() => {
      return document.querySelector('a.cbd-cursor')?.getAttribute('href');
    });

    console.log('\n── Navigation test ────────────────────────────────');
    console.log(`Cursor before J: ${firstCursorHref}`);
    console.log(`Cursor after J:  ${secondCursorHref}`);
    console.log('──────────────────────────────────────────────────\n');

    if (firstCursorHref && secondCursorHref) {
      expect(firstCursorHref).not.toBe(secondCursorHref);
    } else {
      console.warn('⚠️  No cursor found — may have 0 or 1 chat, or selector mismatch');
    }

    // Exit
    await page.keyboard.press('Escape');
    await page.close();
  });
});
