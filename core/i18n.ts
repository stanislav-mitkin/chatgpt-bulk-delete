export function t(key: string, subs?: string | string[]): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (browser.i18n.getMessage as any)(key, subs) || key;
  } catch {
    return key;
  }
}
