import {
  getMode,
  enterMode,
  exitMode,
  moveCursor,
  toggleCurrent,
  selectAll,
  clearAll,
} from './selection';

function isModifier(e: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return isMac ? e.metaKey : e.ctrlKey;
}

function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (target as HTMLElement).isContentEditable;
}

function onKeyDown(e: KeyboardEvent) {
  // Toggle mode: Cmd/Ctrl + Shift + X
  if (isModifier(e) && e.shiftKey && e.key === 'X') {
    e.preventDefault();
    getMode() === 'idle' ? enterMode() : exitMode();
    return;
  }

  // All keys below only work in active mode
  if (getMode() !== 'active') return;

  // Don't intercept typing in inputs
  if (isEditable(e.target)) return;

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      exitMode();
      break;

    case 'j':
    case 'J':
    case 'ArrowDown':
      e.preventDefault();
      moveCursor(+1, e.shiftKey);
      break;

    case 'k':
    case 'K':
    case 'ArrowUp':
      e.preventDefault();
      moveCursor(-1, e.shiftKey);
      break;

    case ' ':
    case 'x':
      e.preventDefault();
      toggleCurrent();
      break;

    case 'a':
    case 'A':
      if (isModifier(e)) {
        e.preventDefault();
        selectAll();
      }
      break;

    case 'd':
    case 'D':
      if (isModifier(e)) {
        e.preventDefault();
        clearAll();
      }
      break;
  }
}

export function initKeybindings() {
  document.addEventListener('keydown', onKeyDown, { capture: true });
}

export function destroyKeybindings() {
  document.removeEventListener('keydown', onKeyDown, { capture: true });
}
