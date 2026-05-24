// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMessage: (key: string, subs?: string | string[]) => string = (browser.i18n.getMessage as any).bind(browser.i18n);

export function t(key: string, subs?: string | string[]): string {
  try {
    return getMessage(key, subs) || key;
  } catch {
    return key;
  }
}
