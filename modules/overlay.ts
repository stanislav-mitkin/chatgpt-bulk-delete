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

  /* ── idle hint ──────────────────────────────────────────────────────────── */
  .hint {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
    text-align: right;
    line-height: 1.5;
    transition: opacity 0.2s;
  }
  .hint.hidden { opacity: 0; }
  .hint .shortcut {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    padding: 1px 4px;
  }

  /* ── active panel ────────────────────────────────────────────────────────── */
  .panel {
    background: rgba(18, 18, 18, 0.93);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #e5e5e5;
    min-width: 210px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .panel.hidden {
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
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
  .count-badge.warn  { color: #f59e0b; }
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

  .branding {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 10px;
    color: rgba(255,255,255,0.2);
    text-align: right;
  }
`;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let hintEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;
let dotEl: HTMLElement | null = null;
let countBadgeEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let progressBarEl: HTMLElement | null = null;
let progressFillEl: HTMLElement | null = null;

export function initOverlay() {
  if (document.getElementById(HOST_ID)) return;

  const mac = isMac();
  const mod = mac ? '⌘' : 'Ctrl+';
  const activationKey = mac ? '⌘⇧K' : 'Ctrl+Shift+K';

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
    <div class="hint">
      ChatGPT Bulk Delete &nbsp;<span class="shortcut">${activationKey}</span>
    </div>
    <div class="panel hidden">
      <div class="header">
        <span class="dot"></span>
        <span class="title">Selection mode</span>
        <span class="count-badge">0 chats selected</span>
      </div>
      <div class="hints">
        ${hints.map(([k, l]) => `<span class="key">${k}</span><span class="label">${l}</span>`).join('')}
      </div>
      <div class="status"></div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
      <div class="branding">ChatGPT Bulk Delete</div>
    </div>
  `;

  document.body.appendChild(host);

  hintEl        = shadow.querySelector('.hint');
  panelEl       = shadow.querySelector('.panel');
  dotEl         = shadow.querySelector('.dot');
  countBadgeEl  = shadow.querySelector('.count-badge');
  statusEl      = shadow.querySelector('.status');
  progressBarEl = shadow.querySelector('.progress-bar');
  progressFillEl = shadow.querySelector('.progress-fill');

  onModeChange((mode) => {
    const active = mode === 'active';
    hintEl?.classList.toggle('hidden', active);
    panelEl?.classList.toggle('hidden', !active);
    if (!active) clearStatus();
  });

  onSelectionChange((ids) => {
    if (!countBadgeEl) return;
    const n = ids.size;
    countBadgeEl.textContent = n === 1 ? '1 chat selected' : `${n} chats selected`;
    countBadgeEl.classList.toggle('has-selection', n > 0);
    countBadgeEl.classList.remove('warn', 'danger');
    dotEl?.classList.remove('warn', 'danger');
  });

  if (getMode() === 'active') {
    hintEl?.classList.add('hidden');
    panelEl?.classList.remove('hidden');
  }
}

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

export function showResult(succeeded: number, failed: number) {
  progressBarEl?.classList.remove('visible');
  dotEl?.classList.remove('warn', 'danger');
  if (failed === 0) {
    setStatus(`Deleted ${succeeded} chat${succeeded !== 1 ? 's' : ''}`, 'success');
  } else {
    setStatus(`Deleted ${succeeded}, failed ${failed}`, 'error');
    countBadgeEl?.classList.add('danger');
    dotEl?.classList.add('danger');
  }
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
  host?.remove();
  host = shadow = hintEl = panelEl = dotEl = countBadgeEl = statusEl = progressBarEl = progressFillEl = null;
}
