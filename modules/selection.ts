import { getChatList, type ChatItem } from './chat-list';

export type SelectionMode = 'idle' | 'active';

const CSS_CURSOR = 'cbd-cursor';
const CSS_SELECTED = 'cbd-selected';

let mode: SelectionMode = 'idle';
let cursorIndex = 0;
let selectedIds = new Set<string>();
let rangeAnchor: number | null = null;

type ModeChangeCallback = (mode: SelectionMode) => void;
type SelectionChangeCallback = (selectedIds: Set<string>, cursor: number) => void;

const modeListeners: ModeChangeCallback[] = [];
const selectionListeners: SelectionChangeCallback[] = [];

// ── public state ──────────────────────────────────────────────────────────────

export function getMode(): SelectionMode { return mode; }
export function getCursorIndex(): number { return cursorIndex; }
export function getSelectedIds(): Set<string> { return selectedIds; }

export function getSelectedItems(): ChatItem[] {
  return getChatList().filter((c) => selectedIds.has(c.id));
}

export function onModeChange(cb: ModeChangeCallback) { modeListeners.push(cb); }
export function onSelectionChange(cb: SelectionChangeCallback) { selectionListeners.push(cb); }

// ── mode ──────────────────────────────────────────────────────────────────────

export function enterMode() {
  if (mode === 'active') return;
  mode = 'active';
  cursorIndex = 0;
  selectedIds = new Set();
  rangeAnchor = null;
  applyClasses();
  modeListeners.forEach((cb) => cb(mode));
  notifySelection();
}

export function exitMode() {
  if (mode === 'idle') return;
  mode = 'idle';
  selectedIds = new Set();
  rangeAnchor = null;
  clearAllClasses();
  modeListeners.forEach((cb) => cb(mode));
  notifySelection();
}

// ── cursor navigation ─────────────────────────────────────────────────────────

export function moveCursor(delta: number, extendSelection = false) {
  const list = getChatList();
  if (!list.length) return;

  const prev = cursorIndex;
  cursorIndex = Math.max(0, Math.min(list.length - 1, cursorIndex + delta));

  if (extendSelection) {
    // Set anchor on the first Shift+move if not already set
    if (rangeAnchor === null) rangeAnchor = prev;
    const [from, to] = [Math.min(rangeAnchor, cursorIndex), Math.max(rangeAnchor, cursorIndex)];
    for (let i = from; i <= to; i++) selectedIds.add(list[i].id);
  } else {
    rangeAnchor = null;
  }

  if (prev !== cursorIndex) {
    scrollCursorIntoView(list[cursorIndex]);
    applyClasses();
    notifySelection();
  }
}

// ── selection ─────────────────────────────────────────────────────────────────

export function toggleCurrent() {
  const list = getChatList();
  if (!list.length) return;
  const item = list[cursorIndex];
  if (!item) return;

  if (selectedIds.has(item.id)) {
    selectedIds.delete(item.id);
  } else {
    selectedIds.add(item.id);
    rangeAnchor = cursorIndex; // anchor for future shift+move
  }

  applyClasses();
  notifySelection();
}

export function selectAll() {
  getChatList().forEach((c) => selectedIds.add(c.id));
  applyClasses();
  notifySelection();
}

export function clearAll() {
  selectedIds = new Set();
  rangeAnchor = null;
  applyClasses();
  notifySelection();
}

// ── DOM classes ───────────────────────────────────────────────────────────────

function applyClasses() {
  const list = getChatList();
  list.forEach((item, i) => {
    item.element.classList.toggle(CSS_CURSOR, mode === 'active' && i === cursorIndex);
    item.element.classList.toggle(CSS_SELECTED, selectedIds.has(item.id));
  });
}

function clearAllClasses() {
  getChatList().forEach((item) => {
    item.element.classList.remove(CSS_CURSOR, CSS_SELECTED);
  });
}

function scrollCursorIntoView(item: ChatItem) {
  item.element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function notifySelection() {
  selectionListeners.forEach((cb) => cb(selectedIds, cursorIndex));
}

// Re-apply classes when the chat list refreshes (e.g. new chats loaded)
export function refreshClasses() {
  if (mode === 'active') applyClasses();
}
