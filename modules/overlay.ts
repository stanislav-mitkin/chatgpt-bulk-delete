import { onModeChange, onSelectionChange, getMode } from './selection';
import { t } from './i18n';

const HOST_ID = 'cbd-overlay-host';
const isMac = () => navigator.platform.toUpperCase().includes('MAC');

const SHADOW_CSS = `
  /* ── theme tokens ─────────────────────────────────────────────────────────── */
  :host {
    /* dark (default) */
    --bg:              rgba(18,18,18,0.88);
    --border:          rgba(255,255,255,0.09);
    --shadow:          0 4px 24px rgba(0,0,0,0.35);
    --text:            #e5e5e5;
    --text-muted:      rgba(255,255,255,0.45);
    --text-dim:        rgba(255,255,255,0.35);
    --text-faint:      rgba(255,255,255,0.18);
    --shortcut-bg:     rgba(255,255,255,0.08);
    --shortcut-fg:     rgba(255,255,255,0.65);
    --divider:         rgba(255,255,255,0.08);
    --btn-ghost-bg:    rgba(255,255,255,0.09);
    --btn-ghost-fg:    rgba(255,255,255,0.65);
    --btn-exit-fg:     rgba(255,255,255,0.35);
    --btn-exit-border: rgba(255,255,255,0.1);
    --title-fg:        #fff;
    --dot:             #10a37f;
    --dot-warn:        #f59e0b;
    --dot-danger:      #ef4444;
    --badge-active:    #10a37f;
    --badge-warn:      #f59e0b;
    --badge-danger:    #ef4444;
    --success:         #10a37f;
    --error:           #ef4444;
    --strip-text:      rgba(255,255,255,0.18);
  }
  :host(.light) {
    --bg:              rgba(250,250,250,0.95);
    --border:          rgba(0,0,0,0.1);
    --shadow:          0 4px 24px rgba(0,0,0,0.12);
    --text:            #1a1a1a;
    --text-muted:      rgba(0,0,0,0.55);
    --text-dim:        rgba(0,0,0,0.42);
    --text-faint:      rgba(0,0,0,0.3);
    --shortcut-bg:     rgba(0,0,0,0.07);
    --shortcut-fg:     rgba(0,0,0,0.6);
    --divider:         rgba(0,0,0,0.08);
    --btn-ghost-bg:    rgba(0,0,0,0.07);
    --btn-ghost-fg:    rgba(0,0,0,0.65);
    --btn-exit-fg:     rgba(0,0,0,0.4);
    --btn-exit-border: rgba(0,0,0,0.12);
    --title-fg:        #111;
    --dot:             #0a8f6e;
    --dot-warn:        #d97706;
    --dot-danger:      #dc2626;
    --badge-active:    #0a8f6e;
    --badge-warn:      #d97706;
    --badge-danger:    #dc2626;
    --success:         #0a8f6e;
    --error:           #dc2626;
    --strip-text:      rgba(0,0,0,0.3);
  }

  /* ── host layout ─────────────────────────────────────────────────────────── */
  :host {
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  /* ── shared card ─────────────────────────────────────────────────────────── */
  .card {
    background: var(--bg);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
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
    color: var(--text-dim);
    white-space: nowrap;
  }

  /* ── select-mode panel ───────────────────────────────────────────────────── */
  .panel {
    padding: 12px 16px;
    color: var(--text);
    min-width: 215px;
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
    background: var(--dot);
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .dot.warn   { background: var(--dot-warn); }
  .dot.danger { background: var(--dot-danger); }

  .title { font-weight: 600; color: var(--title-fg); font-size: 13px; }

  .count-badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
    transition: color 0.15s;
  }
  .count-badge.has-selection { color: var(--badge-active); }
  .count-badge.warn   { color: var(--badge-warn); }
  .count-badge.danger { color: var(--badge-danger); }

  .hints {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
  }
  .key {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--shortcut-fg);
    text-align: right;
    white-space: nowrap;
  }
  .label { font-size: 11px; color: var(--text-muted); }

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
    background: var(--btn-ghost-bg);
    color: var(--btn-ghost-fg);
  }
  .btn-delete { background: var(--dot-danger); color: #fff; }
  .btn-clear  { background: var(--btn-ghost-bg); color: var(--btn-ghost-fg); }
  .btn-exit   {
    width: 100%;
    background: transparent;
    color: var(--btn-exit-fg);
    border: 1px solid var(--btn-exit-border);
    transition: background 0.15s, color 0.15s;
  }
  .btn-exit:hover { background: var(--btn-ghost-bg); color: var(--text-muted); opacity: 1; }

  /* ── action bar (shown when chats selected) ─────────────────────────────── */
  .action-bar {
    display: none;
    gap: 6px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--divider);
  }
  .action-bar.visible { display: flex; }

  /* ── exit bar ────────────────────────────────────────────────────────────── */
  .exit-bar {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--divider);
  }

  /* ── status / progress ───────────────────────────────────────────────────── */
  .status {
    display: none;
    font-size: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--divider);
    color: var(--text-muted);
  }
  .status.visible  { display: block; }
  .status.confirm  { color: var(--dot-warn); }
  .status.error    { color: var(--error); }
  .status.success  { color: var(--success); }

  .progress-bar { height: 2px; background: var(--divider); border-radius: 1px; margin-top: 6px; display: none; overflow: hidden; }
  .progress-bar.visible { display: block; }
  .progress-fill { height: 100%; background: var(--dot); border-radius: 1px; transition: width 0.2s; width: 0%; }

  /* ── shortcut chip (shared) ──────────────────────────────────────────────── */
  .shortcut {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: var(--shortcut-bg);
    color: var(--shortcut-fg);
    border-radius: 3px;
    padding: 1px 4px;
  }

  /* ── persistent bottom strip ──────────────────────────────────────────── */
  .hint {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--strip-text);
    line-height: 1.5;
  }
  .hint-action { flex: 1; white-space: nowrap; transition: color 0.2s; }
  .hint-action.success { color: var(--success); }
  .hint-action.error   { color: var(--error); }
  .hint-brand  { white-space: nowrap; }
`;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let themeObserver: MutationObserver | null = null;

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
let clearHandler:  (() => void) | null = null;
let selectHandler: (() => void) | null = null;
let exitHandler:   (() => void) | null = null;
let resultResetTimer: ReturnType<typeof setTimeout> | null = null;

// ── theme ─────────────────────────────────────────────────────────────────────

function detectTheme(): 'dark' | 'light' {
  if (document.documentElement.classList.contains('dark')) return 'dark';
  // fallback: system preference
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  host?.classList.toggle('light', theme === 'light');
}

// ── init ──────────────────────────────────────────────────────────────────────

export function initOverlay() {
  if (document.getElementById(HOST_ID)) return;

  const mac = isMac();
  const mod = mac ? '⌘' : 'Ctrl+';
  activationKeyCache = mac ? '⌘⇧K' : 'Ctrl+Shift+K';

  const hints: [string, string][] = [
    ['click / Space', t('key_chat')],
    [`${mod}A`,       t('key_all')],
    [`${mod}D`,       t('key_clear')],
    ['↩ × 2',         t('key_delete')],
    ['Esc',           t('key_exit')],
  ];

  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${SHADOW_CSS}</style>

    <div class="card idle-card">
      <span class="idle-hint"><span class="shortcut">${activationKeyCache}</span> ${t('idle_hint')}</span>
      <button class="btn btn-select">${t('btn_select')}</button>
    </div>

    <div class="card panel hidden">
      <div class="header">
        <span class="dot"></span>
        <span class="title">${t('mode_title')}</span>
        <span class="count-badge">${t('sel0')}</span>
      </div>
      <div class="hints">
        ${hints.map(([k, l]) => `<span class="key">${k}</span><span class="label">${l}</span>`).join('')}
      </div>
      <div class="action-bar">
        <button class="btn btn-clear">${t('btn_clear')}</button>
        <button class="btn btn-delete">${t('btn_del1')}</button>
      </div>
      <div class="status"></div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <div class="exit-bar">
        <button class="btn btn-exit">${t('btn_exit')}</button>
      </div>
    </div>

    <div class="hint">
      <span class="hint-action"><span class="shortcut">${activationKeyCache}</span> ${t('enter')}</span>
      <span class="hint-brand">${t('branding')}</span>
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

  // theme
  applyTheme(detectTheme());
  themeObserver = new MutationObserver(() => applyTheme(detectTheme()));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  onModeChange((mode) => {
    const active = mode === 'active';
    idleCardEl?.classList.toggle('hidden', active);
    panelEl?.classList.toggle('hidden', !active);
    if (hintActionEl && !hintActionEl.classList.contains('success') && !hintActionEl.classList.contains('error')) {
      hintActionEl.innerHTML = `<span class="shortcut">${activationKeyCache}</span> ${active ? t('exitMode') : t('enter')}`;
    }
    if (!active) clearStatus();
  });

  onSelectionChange((ids) => {
    if (!countBadgeEl) return;
    const n = ids.size;
    countBadgeEl.textContent =
      n === 0 ? t('sel0') :
      n === 1 ? t('sel1') :
                t('selN', [String(n)]);
    countBadgeEl.classList.toggle('has-selection', n > 0);
    countBadgeEl.classList.remove('warn', 'danger');
    dotEl?.classList.remove('warn', 'danger');
    actionBarEl?.classList.toggle('visible', n > 0);
    if (deleteBtnEl) {
      deleteBtnEl.textContent = n === 1 ? t('btn_del1') : t('btn_delN', [String(n)]);
    }
  });

  if (getMode() === 'active') {
    idleCardEl?.classList.add('hidden');
    panelEl?.classList.remove('hidden');
    if (hintActionEl) {
      hintActionEl.innerHTML = `<span class="shortcut">${activationKeyCache}</span> ${t('exitMode')}`;
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
  setStatus(n === 1 ? t('conf1') : t('confN', [String(n)]), 'confirm');
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
    hintActionEl.textContent = succeeded === 1 ? t('done1') : t('doneN', [String(succeeded)]);
    hintActionEl.className = 'hint-action success';
  } else {
    hintActionEl.textContent = t('doneFail', [String(succeeded), String(failed)]);
    hintActionEl.className = 'hint-action error';
  }

  resultResetTimer = setTimeout(resetHintAction, 3000);
}

function resetHintAction() {
  resultResetTimer = null;
  if (!hintActionEl) return;
  hintActionEl.innerHTML = `<span class="shortcut">${activationKeyCache}</span> ${t('enter')}`;
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
  themeObserver?.disconnect();
  themeObserver = null;
  if (resultResetTimer) { clearTimeout(resultResetTimer); resultResetTimer = null; }
  host?.remove();
  host = shadow = idleCardEl = panelEl = dotEl = countBadgeEl = statusEl =
    progressBarEl = progressFillEl = actionBarEl = deleteBtnEl = clearBtnEl =
    exitBtnEl = selectBtnEl = hintActionEl = null;
  deleteHandler = clearHandler = selectHandler = exitHandler = null;
  activationKeyCache = '';
}
