import { onModeChange, onSelectionChange, getMode } from './selection';

const HOST_ID = 'cbd-overlay-host';
const isMac = () => navigator.platform.toUpperCase().includes('MAC');

const SHADOW_CSS = `
  :host {
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
  }

  /* ── shared card base ────────────────────────────────────────────────────── */
  .card {
    background: rgba(18, 18, 18, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .card.hidden {
    opacity: 0;
    transform: translateY(5px);
    pointer-events: none;
  }

  /* ── idle card ───────────────────────────────────────────────────────────── */
  .idle-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px 8px 13px;
    margin-bottom: 6px;
  }
  .idle-hint {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    white-space: nowrap;
  }
  .idle-hint .shortcut {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    padding: 1px 4px;
    margin-right: 2px;
  }

  /* ── select-mode panel ───────────────────────────────────────────────────── */
  .panel {
    padding: 12px 16px;
    color: #e5e5e5;
    min-width: 210px;
    margin-bottom: 6px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #10a37f;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .dot.warn   { background: #f59e0b; }
  .dot.danger { background: #ef4444; }

  .title { font-weight: 600; color: #fff; font-size: 13px; }

  .count-badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    white-space: nowrap;
    transition: color 0.15s;
  }
  .count-badge.has-selection { color: #10a37f; }
  .count-badge.warn   { color: #f59e0b; }
  .count-badge.danger { color: #ef4444; }

  .hints {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
  }
  .key {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    text-align: right;
    white-space: nowrap;
  }
  .label { font-size: 11px; color: rgba(255,255,255,0.45); }

  /* ── buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: none;
    border-radius: 6px;
    padding: 5px 10px;
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.15s;
    white-space: nowrap;
    pointer-events: auto;
  }
  .btn:hover { opacity: 0.8; }

  .btn-select {
    background: rgba(255,255,255,0.11);
    color: rgba(255,255,255,0.75);
  }
  .btn-delete { background: #ef4444; color: #fff; }
  .btn-clear  { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); }
  .btn-exit   {
    width: 100%;
    background: transparent;
    color: rgba(255,255,255,0.35);
    border: 1px solid rgba(255,255,255,0.1);
    transition: background 0.15s, color 0.15s;
  }
  .btn-exit:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); opacity: 1; }

  /* ── action bar (shown when chats selected) ─────────────────────────────── */
  .action-bar {
    display: none;
    gap: 6px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .action-bar.visible { display: flex; }

  /* ── exit bar ────────────────────────────────────────────────────────────── */
  .exit-bar {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  /* ── status / progress ───────────────────────────────────────────────────── */
  .status {
    display: none;
    font-size: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.6);
  }
  .status.visible  { display: block; }
  .status.confirm  { color: #f59e0b; }
  .status.error    { color: #ef4444; }
  .status.success  { color: #10a37f; }

  .progress-bar { height: 2px; background: rgba(255,255,255,0.1); border-radius: 1px; margin-top: 6px; display: none; overflow: hidden; }
  .progress-bar.visible { display: block; }
  .progress-fill { height: 100%; background: #10a37f; border-radius: 1px; transition: width 0.2s; width: 0%; }

  /* ── persistent bottom strip ──────────────────────────────────────────── */
  .hint {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.18);
    line-height: 1.5;
  }
  .hint .shortcut {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: rgba(255,255,255,0.07);
    border-radius: 3px;
    padding: 1px 4px;
  }
  .hint-action { flex: 1; white-space: nowrap; transition: color 0.2s; }
  .hint-action.success { color: #10a37f; }
  .hint-action.error   { color: #ef4444; }
  .hint-brand  { white-space: nowrap; }
`;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;

let idleCardEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;
let dotEl: HTMLElement | null = null;
let countBadgeEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let progressBarEl: HTMLElement | null = null;
let progressFillEl: HTMLElement | null = null;
let actionBarEl: HTMLElement | null = null;
let deleteBtnEl: HTMLButtonElement | null = null;
let clearBtnEl: HTMLButtonElement | null = null;
let exitBtnEl: HTMLButtonElement | null = null;
let selectBtnEl: HTMLButtonElement | null = null;
let hintActionEl: HTMLElement | null = null;

let activationKeyCache = '';
let deleteHandler: (() => void) | null = null;
let clearHandler: (() => void) | null = null;
let selectHandler: (() => void) | null = null;
let exitHandler: (() => void) | null = null;
let resultResetTimer: ReturnType<typeof setTimeout> | null = null;

export function initOverlay() {
  if (document.getElementById(HOST_ID)) return;

  const mac = isMac();
  const mod = mac ? '⌘' : 'Ctrl+';
  activationKeyCache = mac ? '⌘⇧K' : 'Ctrl+Shift+K';

  const hints = [
    ['click / Space', 'select chat'],
    [`${mod}A`, 'select all'],
    [`${mod}D`, 'clear'],
    ['↩ × 2', 'delete'],
    ['Esc', 'exit'],
  ];

  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${SHADOW_CSS}</style>

    <div class="card idle-card">
      <span class="idle-hint"><span class="shortcut">${activationKeyCache}</span> to bulk select</span>
      <button class="btn btn-select">Select chats</button>
    </div>

    <div class="card panel hidden">
      <div class="header">
        <span class="dot"></span>
        <span class="title">Selection mode</span>
        <span class="count-badge">0 chats selected</span>
      </div>
      <div class="hints">
        ${hints.map(([k, l]) => `<span class="key">${k}</span><span class="label">${l}</span>`).join('')}
      </div>
      <div class="action-bar">
        <button class="btn btn-clear">Clear</button>
        <button class="btn btn-delete">Delete</button>
      </div>
      <div class="status"></div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <div class="exit-bar">
        <button class="btn btn-exit">Exit Select mode</button>
      </div>
    </div>

    <div class="hint">
      <span class="hint-action"><span class="shortcut">${activationKeyCache}</span> Enter Select mode</span>
      <span class="hint-brand">ChatGPT Bulk Delete</span>
    </div>
  `;

  document.body.appendChild(host);

  idleCardEl     = shadow.querySelector('.idle-card');
  panelEl        = shadow.querySelector('.panel');
  dotEl          = shadow.querySelector('.dot');
  countBadgeEl   = shadow.querySelector('.count-badge');
  statusEl       = shadow.querySelector('.status');
  progressBarEl  = shadow.querySelector('.progress-bar');
  progressFillEl = shadow.querySelector('.progress-fill');
  actionBarEl    = shadow.querySelector('.action-bar');
  deleteBtnEl    = shadow.querySelector('.btn-delete');
  clearBtnEl     = shadow.querySelector('.btn-clear');
  exitBtnEl      = shadow.querySelector('.btn-exit');
  selectBtnEl    = shadow.querySelector('.btn-select');
  hintActionEl   = shadow.querySelector('.hint-action');

  selectBtnEl?.addEventListener('click', () => selectHandler?.());
  deleteBtnEl?.addEventListener('click', () => deleteHandler?.());
  clearBtnEl?.addEventListener('click',  () => clearHandler?.());
  exitBtnEl?.addEventListener('click',   () => exitHandler?.());

  onModeChange((mode) => {
    const active = mode === 'active';
    idleCardEl?.classList.toggle('hidden', active);
    panelEl?.classList.toggle('hidden', !active);
    if (hintActionEl && !hintActionEl.classList.contains('success') && !hintActionEl.classList.contains('error')) {
      hintActionEl.innerHTML = active
        ? `<span class="shortcut">${activationKeyCache}</span> Exit Select mode`
        : `<span class="shortcut">${activationKeyCache}</span> Enter Select mode`;
    }
    if (!active) clearStatus();
  });

  onSelectionChange((ids) => {
    if (!countBadgeEl) return;
    const n = ids.size;
    countBadgeEl.textContent = n === 1 ? '1 chat selected' : `${n} chats selected`;
    countBadgeEl.classList.toggle('has-selection', n > 0);
    countBadgeEl.classList.remove('warn', 'danger');
    dotEl?.classList.remove('warn', 'danger');
    actionBarEl?.classList.toggle('visible', n > 0);
    if (deleteBtnEl) {
      deleteBtnEl.textContent = n === 1 ? 'Delete 1 chat' : `Delete ${n} chats`;
    }
  });

  if (getMode() === 'active') {
    idleCardEl?.classList.add('hidden');
    panelEl?.classList.remove('hidden');
    if (hintActionEl) {
      hintActionEl.innerHTML = `<span class="shortcut">${activationKeyCache}</span> Exit Select mode`;
    }
  }
}

// ── button callbacks ──────────────────────────────────────────────────────────

export function onSelectButtonClick(cb: () => void) { selectHandler = cb; }
export function onDeleteButtonClick(cb: () => void) { deleteHandler = cb; }
export function onClearButtonClick(cb: () => void)  { clearHandler = cb; }
export function onExitButtonClick(cb: () => void)   { exitHandler = cb; }

// ── status API ────────────────────────────────────────────────────────────────

export function showConfirm(n: number) {
  setStatus(`Press ↩ again to delete ${n} chat${n !== 1 ? 's' : ''}`, 'confirm');
  countBadgeEl?.classList.add('warn');
  dotEl?.classList.add('warn');
}

export function showProgress(done: number, total: number) {
  clearStatusText();
  if (!progressBarEl || !progressFillEl) return;
  progressBarEl.classList.add('visible');
  progressFillEl.style.width = `${Math.round((done / total) * 100)}%`;
}

export function showDeletedInStrip(succeeded: number, failed: number) {
  if (!hintActionEl) return;
  if (resultResetTimer) { clearTimeout(resultResetTimer); resultResetTimer = null; }

  if (failed === 0) {
    hintActionEl.textContent = `Deleted ${succeeded} chat${succeeded !== 1 ? 's' : ''}`;
    hintActionEl.className = 'hint-action success';
  } else {
    hintActionEl.textContent = `Deleted ${succeeded}, failed ${failed}`;
    hintActionEl.className = 'hint-action error';
  }

  resultResetTimer = setTimeout(resetHintAction, 3000);
}

function resetHintAction() {
  resultResetTimer = null;
  if (!hintActionEl) return;
  hintActionEl.innerHTML = `<span class="shortcut">${activationKeyCache}</span> Enter Select mode`;
  hintActionEl.className = 'hint-action';
}

export function clearStatus() {
  clearStatusText();
  progressBarEl?.classList.remove('visible');
  countBadgeEl?.classList.remove('warn', 'danger');
  dotEl?.classList.remove('warn', 'danger');
}

function setStatus(text: string, type: 'confirm' | 'error' | 'success') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `status visible ${type}`;
}

function clearStatusText() {
  if (!statusEl) return;
  statusEl.textContent = '';
  statusEl.className = 'status';
}

export function destroyOverlay() {
  if (resultResetTimer) { clearTimeout(resultResetTimer); resultResetTimer = null; }
  host?.remove();
  host = shadow = idleCardEl = panelEl = dotEl = countBadgeEl = statusEl =
    progressBarEl = progressFillEl = actionBarEl = deleteBtnEl = clearBtnEl =
    exitBtnEl = selectBtnEl = hintActionEl = null;
  deleteHandler = clearHandler = selectHandler = exitHandler = null;
  activationKeyCache = '';
}
