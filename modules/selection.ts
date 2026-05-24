import { getChatList, type ChatItem } from './chat-list';

export type SelectionMode = 'idle' | 'active';

const CSS_HOVER    = 'cbd-hover';
const CSS_SELECTED = 'cbd-selected';

let mode: SelectionMode = 'idle';
let selectedIds = new Set<string>();
let hoveredId: string | null = null;

type ModeChangeCallback = (mode: SelectionMode) => void;
type SelectionChangeCallback = (selectedIds: Set<string>) => void;

const modeListeners: ModeChangeCallback[] = [];
const selectionListeners: SelectionChangeCallback[] = [];

// ── public state ──────────────────────────────────────────────────────────────

export function getMode(): SelectionMode { return mode; }
export function getSelectedIds(): Set<string> { return selectedIds; }
export function getHoveredId(): string | null { return hoveredId; }

export function getSelectedItems(): ChatItem[] {
  return getChatList().filter((c) => selectedIds.has(c.id));
}

export function onModeChange(cb: ModeChangeCallback) { modeListeners.push(cb); }
export function onSelectionChange(cb: SelectionChangeCallback) { selectionListeners.push(cb); }

// ── mode ──────────────────────────────────────────────────────────────────────

export function enterMode() {
  if (mode === 'active') return;
  mode = 'active';
  selectedIds = new Set();
  hoveredId = null;
  // Blur any focused input so Space / Cmd+A work immediately
  (document.activeElement as HTMLElement)?.blur?.();
  modeListeners.forEach((cb) => cb(mode));
  notifySelection();
}

export function exitMode() {
  if (mode === 'idle') return;
  mode = 'idle';
  selectedIds = new Set();
  hoveredId = null;
  clearAllClasses();
  modeListeners.forEach((cb) => cb(mode));
  notifySelection();
}

// ── hover ─────────────────────────────────────────────────────────────────────

export function setHovered(id: string | null) {
  if (hoveredId === id) return;

  // Remove hover class from previous
  if (hoveredId) {
    getChatList().find((c) => c.id === hoveredId)?.element.classList.remove(CSS_HOVER);
  }
  hoveredId = id;
  if (id) {
    getChatList().find((c) => c.id === id)?.element.classList.add(CSS_HOVER);
  }
}

// ── selection ─────────────────────────────────────────────────────────────────

export function toggleById(id: string) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);

  const item = getChatList().find((c) => c.id === id);
  if (item) item.element.classList.toggle(CSS_SELECTED, selectedIds.has(id));

  notifySelection();
}

export function toggleHovered() {
  if (hoveredId) toggleById(hoveredId);
}

export function selectAll() {
  getChatList().forEach((c) => {
    selectedIds.add(c.id);
    c.element.classList.add(CSS_SELECTED);
  });
  notifySelection();
}

export function clearAll() {
  getChatList().forEach((c) => c.element.classList.remove(CSS_SELECTED));
  selectedIds = new Set();
  notifySelection();
}

// ── DOM ───────────────────────────────────────────────────────────────────────

function clearAllClasses() {
  getChatList().forEach((item) => {
    item.element.classList.remove(CSS_HOVER, CSS_SELECTED);
  });
}

export function refreshClasses() {
  if (mode !== 'active') return;
  getChatList().forEach((item) => {
    item.element.classList.toggle(CSS_SELECTED, selectedIds.has(item.id));
    item.element.classList.toggle(CSS_HOVER, item.id === hoveredId);
  });
}

function notifySelection() {
  selectionListeners.forEach((cb) => cb(selectedIds));
}
