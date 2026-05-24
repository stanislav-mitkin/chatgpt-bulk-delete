import {
  getMode,
  enterMode,
  exitMode,
  moveCursor,
  toggleCurrent,
  selectAll,
  clearAll,
  getSelectedIds,
  getSelectedItems,
} from './selection';
import { deleteConversations } from './deleter';
import { showConfirm, showProgress, showResult, clearStatus } from './overlay';

const CONFIRM_TIMEOUT_MS = 2000;

let pendingDelete = false;
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

function isModifier(e: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return isMac ? e.metaKey : e.ctrlKey;
}

function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (target as HTMLElement).isContentEditable;
}

function cancelPending() {
  pendingDelete = false;
  if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
  clearStatus();
}

async function confirmAndDelete() {
  const ids = [...getSelectedIds()];
  if (!ids.length) return;

  if (!pendingDelete) {
    // First press: ask for confirmation
    pendingDelete = true;
    showConfirm(ids.length);
    confirmTimer = setTimeout(cancelPending, CONFIRM_TIMEOUT_MS);
    return;
  }

  // Second press within timeout: delete
  cancelPending();

  // Optimistic UI: hide elements immediately
  const items = getSelectedItems();
  const hiddenEls: HTMLElement[] = [];
  items.forEach((item) => {
    // Walk up to find the list item wrapper (<li> or similar container)
    const row = item.element.closest('li') ?? item.element.parentElement ?? item.element;
    (row as HTMLElement).style.display = 'none';
    hiddenEls.push(row as HTMLElement);
  });

  exitMode();

  const result = await deleteConversations(ids, (done, total) => {
    showProgress(done, total);
  });

  // Restore any failed items
  result.failed.forEach((failedId) => {
    const item = items.find((it) => it.id === failedId);
    if (item) {
      const row = item.element.closest('li') ?? item.element.parentElement ?? item.element;
      (row as HTMLElement).style.display = '';
    }
  });

  showResult(result.succeeded.length, result.failed.length);

  // Auto-clear success message after 3s
  if (result.failed.length === 0) {
    setTimeout(clearStatus, 3000);
  }
}

function onKeyDown(e: KeyboardEvent) {
  // Toggle mode: Cmd/Ctrl + Shift + X
  if (isModifier(e) && e.shiftKey && e.key === 'X') {
    e.preventDefault();
    if (getMode() === 'idle') {
      enterMode();
    } else {
      cancelPending();
      exitMode();
    }
    return;
  }

  if (getMode() !== 'active') return;

  // Escape always exits selection mode, even from an input field
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelPending();
    exitMode();
    return;
  }

  // All other keys: don't intercept typing in inputs
  if (isEditable(e.target)) return;

  switch (e.key) {

    case 'j':
    case 'J':
    case 'ArrowDown':
      e.preventDefault();
      cancelPending();
      moveCursor(+1, e.shiftKey);
      break;

    case 'k':
    case 'K':
    case 'ArrowUp':
      e.preventDefault();
      cancelPending();
      moveCursor(-1, e.shiftKey);
      break;

    case ' ':
    case 'x':
      e.preventDefault();
      cancelPending();
      toggleCurrent();
      break;

    case 'a':
    case 'A':
      if (isModifier(e)) {
        e.preventDefault();
        cancelPending();
        selectAll();
      }
      break;

    case 'd':
    case 'D':
      if (isModifier(e)) {
        e.preventDefault();
        cancelPending();
        clearAll();
      }
      break;

    case 'Enter':
      e.preventDefault();
      confirmAndDelete();
      break;
  }
}

export function initKeybindings() {
  document.addEventListener('keydown', onKeyDown, { capture: true });
}

export function destroyKeybindings() {
  cancelPending();
  document.removeEventListener('keydown', onKeyDown, { capture: true });
}
