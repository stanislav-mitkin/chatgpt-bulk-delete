const STYLE_ID = 'cbd-styles';

const CSS = `
/* Keyboard cursor — visible ring around the focused chat */
a.cbd-cursor {
  outline: 2px solid #10a37f !important;
  outline-offset: -2px !important;
  border-radius: 6px !important;
}

/* Selected chat — subtle green tint */
a.cbd-selected {
  background-color: rgba(16, 163, 127, 0.18) !important;
  border-radius: 6px !important;
}

/* Selected AND under cursor */
a.cbd-cursor.cbd-selected {
  background-color: rgba(16, 163, 127, 0.28) !important;
}
`;

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function removeStyles() {
  document.getElementById(STYLE_ID)?.remove();
}
