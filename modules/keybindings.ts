import {
  getMode, enterMode, exitMode,
  toggleHovered, toggleById, selectAll, clearAll,
  setHovered, getSelectedIds, getSelectedItems,
} from './selection';
import { extractIdFromHref } from './chat-list';
import { deleteConversations } from './deleter';
import { showConfirm, showProgress, showResult, clearStatus } from './overlay';

const CONFIRM_TIMEOUT_MS = 2000;

let pendingDelete = false;
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

// Use e.code (physical key position) — layout-independent, works in all languages
const isMac = () => navigator.platform.toUpperCase().includes('MAC');
const isModifier = (e: KeyboardEvent) => isMac() ? e.metaKey : e.ctrlKey;

function cancelPending() {
  pendingDelete = false;
  if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
  clearStatus();
}

async function confirmAndDelete() {
  const ids = [...getSelectedIds()];
  if (!ids.length) return;

  if (!pendingDelete) {
    pendingDelete = true;
    showConfirm(ids.length);
    confirmTimer = setTimeout(cancelPending, CONFIRM_TIMEOUT_MS);
    return;
  }

  cancelPending();

  const items = getSelectedItems();
  items.forEach((item) => {
    const row = item.element.closest('li') ?? item.element.parentElement ?? item.element;
    (row as HTMLElement).style.display = 'none';
  });

  exitMode();

  const result = await deleteConversations(ids, (done, total) => showProgress(done, total));

  result.failed.forEach((failedId) => {
    const item = items.find((it) => it.id === failedId);
    if (item) {
      const row = item.element.closest('li') ?? item.element.parentElement ?? item.element;
      (row as HTMLElement).style.display = '';
    }
  });

  showResult(result.succeeded.length, result.failed.length);
  if (result.failed.length === 0) setTimeout(clearStatus, 3000);
}

// ── keyboard ──────────────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
  // Toggle mode: Cmd/Ctrl + Shift + K  (e.code is layout-independent)
  if (isModifier(e) && e.shiftKey && e.code === 'KeyK') {
    e.preventDefault();
    getMode() === 'idle' ? enterMode() : (cancelPending(), exitMode());
    return;
  }

  if (getMode() !== 'active') return;

  // Escape: always exit, even from an input
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelPending();
    exitMode();
    return;
  }

  // Space, Cmd+A, Cmd+D, Enter — don't intercept if a non-chat input is focused
  const active = document.activeElement;
  const inInput = active && (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    (active as HTMLElement).isContentEditable
  );
  if (inInput) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      cancelPending();
      toggleHovered();
      break;

    case 'KeyA':
      if (isModifier(e)) { e.preventDefault(); cancelPending(); selectAll(); }
      break;

    case 'KeyD':
      if (isModifier(e)) { e.preventDefault(); cancelPending(); clearAll(); }
      break;

    case 'Enter':
      e.preventDefault();
      confirmAndDelete();
      break;
  }
}

// ── mouse: hover + click delegation ──────────────────────────────────────────

const CHAT_SELECTOR = 'a[data-sidebar-item="true"][href*="/c/"], a[href*="/c/"]';

function getChatEl(target: EventTarget | null): HTMLAnchorElement | null {
  if (!target || !(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>(CHAT_SELECTOR);
}

function onMouseOver(e: MouseEvent) {
  if (getMode() !== 'active') return;
  const el = getChatEl(e.target);
  if (!el) return;
  const id = el.dataset.chatId ?? extractIdFromHref(el.getAttribute('href') || '');
  if (id) {
    if (!el.dataset.chatId) el.dataset.chatId = id;
    setHovered(id);
  }
}

function onMouseOut(e: MouseEvent) {
  if (getMode() !== 'active') return;
  const el = getChatEl(e.target);
  if (el) setHovered(null);
}

function onClick(e: MouseEvent) {
  if (getMode() !== 'active') return;
  const el = getChatEl(e.target);
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  const id = el.dataset.chatId ?? extractIdFromHref(el.getAttribute('href') || '');
  if (id) toggleById(id);
}

// ── init / destroy ────────────────────────────────────────────────────────────

export function initKeybindings() {
  document.addEventListener('keydown', onKeyDown, { capture: true });
  document.addEventListener('mouseover', onMouseOver, { capture: true });
  document.addEventListener('mouseout', onMouseOut, { capture: true });
  document.addEventListener('click', onClick, { capture: true });
}

export function destroyKeybindings() {
  cancelPending();
  document.removeEventListener('keydown', onKeyDown, { capture: true });
  document.removeEventListener('mouseover', onMouseOver, { capture: true });
  document.removeEventListener('mouseout', onMouseOut, { capture: true });
  document.removeEventListener('click', onClick, { capture: true });
}
