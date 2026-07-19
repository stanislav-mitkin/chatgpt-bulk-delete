const STYLE_ID = 'cbd-styles';

// Generic <style> tag lifecycle — the actual CSS text is owned by the site adapter.
export function injectStyles(css: string) {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

export function removeStyles() {
  document.getElementById(STYLE_ID)?.remove();
}
