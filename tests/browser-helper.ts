import { chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
export const PROFILE_DIR = path.resolve(__dirname, '../test-profile');
export const CHATGPT_URL = 'https://chatgpt.com';

export async function launchRealChrome(profileDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(profileDir, {
    // Use the real installed Chrome — avoids Google bot-detection on login
    channel: 'chrome',
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    // Don't expose navigator.webdriver = true
    ignoreDefaultArgs: ['--enable-automation'],
  });
}
