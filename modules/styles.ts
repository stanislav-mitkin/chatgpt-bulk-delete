const STYLE_ID = 'cbd-styles';

const CSS = `
/* Hovered chat in selection mode */
a.cbd-hover {
  outline: 2px solid rgba(16, 163, 127, 0.7) !important;
  outline-offset: -2px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
}

/* Selected chat */
a.cbd-selected {
  background-color: rgba(16, 163, 127, 0.18) !important;
  border-radius: 6px !important;
}

/* Hovered + selected */
a.cbd-hover.cbd-selected {
  background-color: rgba(16, 163, 127, 0.28) !important;
  outline-color: #10a37f !important;
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
