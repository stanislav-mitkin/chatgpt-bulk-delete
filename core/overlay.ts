import { onModeChange, onSelectionChange, getMode } from './selection';
import { t } from './i18n';
import { isMac } from './platform';

const HOST_ID = 'cbd-overlay-host';

// Tab (44px) is leftmost; panel (220px) to its right — total = 264px
// When closed: translateX(220) hides panel off-screen, shows only the tab pill at right edge
// When open:   translateX(0)   shows both, panel's right edge at screen edge
const TAB_W   = 44;
const PANEL_W = 220;

// Small pause before the tab reveals itself, so it doesn't pop in the instant
// the chat list finishes loading — gives the entrance bounce a deliberate beat.
const REVEAL_DELAY_MS = 400;

const LOGO_ICON = `<svg class="icon-logo" viewBox="0 0 128 128" width="22" height="22" aria-hidden="true">
  <defs>
    <linearGradient id="cbd-g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#10a37f"/>
      <stop offset="100%" style="stop-color:#0a8f6e"/>
    </linearGradient>
  </defs>
  <rect x="22" y="28" width="84" height="12" rx="6" fill="url(#cbd-g)"/>
  <rect x="46" y="14" width="36" height="14" rx="7" fill="url(#cbd-g)"/>
  <rect x="30" y="44" width="68" height="70" rx="8" fill="url(#cbd-g)"/>
  <rect x="46" y="56" width="8" height="46" rx="4" fill="white" opacity="0.6"/>
  <rect x="60" y="56" width="8" height="46" rx="4" fill="white" opacity="0.6"/>
  <rect x="74" y="56" width="8" height="46" rx="4" fill="white" opacity="0.6"/>
</svg>`;

const ARROW_LEFT  = `<svg class="arrow arrow-open"  viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>`;
const ARROW_RIGHT = `<svg class="arrow arrow-close" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>`;

// Light token values — shared by the :host default and the explicit :host(.light) override.
const LIGHT_TOKENS = `
    --bg:         rgba(255,255,255,0.98);
    --border:     rgba(0,0,0,0.1);
    --shadow:     -4px 0 24px rgba(0,0,0,0.12);
    --tab-shadow: -3px 2px 14px rgba(0,0,0,0.1);
    --text:       #1a1a1a;
    --text-muted: rgba(0,0,0,0.5);
    --text-dim:   rgba(0,0,0,0.35);
    --divider:    rgba(0,0,0,0.07);
    --accent:     #10a37f;
    --accent-bg:  rgba(16,163,127,0.09);
    --danger:     #ef4444;
    --warn:       #f59e0b;
    --warn-bg:    rgba(245,158,11,0.1);
    --ghost-bg:   rgba(0,0,0,0.04);
    --ghost-fg:   rgba(0,0,0,0.55);
    --success:    #0a8f6e;
    --error:      #d93025;`;

// Dark token values — shared by the prefers-color-scheme fallback and the explicit :host(.dark) override.
const DARK_TOKENS = `
    --bg:         rgba(32,33,36,0.98);
    --border:     rgba(255,255,255,0.1);
    --shadow:     -4px 0 24px rgba(0,0,0,0.45);
    --tab-shadow: -3px 2px 14px rgba(0,0,0,0.3);
    --text:       #e8eaed;
    --text-muted: rgba(255,255,255,0.5);
    --text-dim:   rgba(255,255,255,0.32);
    --divider:    rgba(255,255,255,0.08);
    --accent:     #19c37d;
    --accent-bg:  rgba(25,195,125,0.14);
    --danger:     #ef4444;
    --warn:       #fdd663;
    --warn-bg:    rgba(253,214,99,0.1);
    --ghost-bg:   rgba(255,255,255,0.06);
    --ghost-fg:   rgba(255,255,255,0.58);
    --success:    #19c37d;
    --error:      #f28b82;`;

const SHADOW_CSS = `
  /* ── tokens ─────────────────────────────────────────────── */
  /* Base = light; dark applies via prefers-color-scheme as a pre-JS fallback.
     ChatGPT lets users pick a theme independently of the OS, so initOverlay()
     also drives an explicit .light / .dark class on the host (see applyTheme),
     and those classed overrides win over the media-query fallback. */
  :host {${LIGHT_TOKENS}
  }
  @media (prefers-color-scheme: dark) {
    :host {${DARK_TOKENS}
    }
  }
  :host(.light) {${LIGHT_TOKENS}
  }
  :host(.dark) {${DARK_TOKENS}
  }

  /* ── host: anchored to right edge ───────────────────────── */
  :host {
    all: initial;
    position: fixed;
    right: 0;
    bottom: 120px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
  }

  /* ── card: flex row, aligns tab pill vertically centered ── */
  /* Card itself has NO background — only .tab and .panel do  */
  .card {
    display: flex;
    flex-direction: row;
    align-items: center;
    transform: translateX(${PANEL_W}px);
    transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }
  .card.open { transform: translateX(0); }

  /* ── entrance: slide in from fully off-screen with a light bounce ──
     Final frame must match the resting transform above so removing
     .card-enter after animationend causes no visual jump. */
  @keyframes cbd-card-enter {
    0%   { transform: translateX(${PANEL_W + 60}px); }
    55%  { transform: translateX(${PANEL_W - 8}px); }
    78%  { transform: translateX(${PANEL_W + 3}px); }
    100% { transform: translateX(${PANEL_W}px); }
  }
  .card.card-enter {
    animation: cbd-card-enter 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  @media (prefers-reduced-motion: reduce) {
    .card.card-enter { animation: none; }
  }

  /* ── tab: compact pill — the only thing visible when closed */
  .tab {
    position: relative;
    width: ${TAB_W}px;
    height: 64px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    pointer-events: auto;
    background: var(--bg);
    border: 1px solid var(--border);
    border-right: none;               /* flush against panel left edge */
    border-radius: 12px 0 0 12px;
    box-shadow: var(--tab-shadow);
    color: var(--text-muted);
    transition: color 0.18s, background 0.18s;
    user-select: none;
    -webkit-user-select: none;
  }
  .tab:hover {
    color: var(--accent);
    background: var(--accent-bg);
  }
  .tab.active { color: var(--accent); }

  /* ── arrows: ← when closed, → when open ─────────────────── */
  .arrow { display: none; }
  .arrow-open  { display: block; }
  .card.open .arrow-open  { display: none; }
  .card.open .arrow-close { display: block; }

  /* ── result dot: success/error indicator in tab corner ───── */
  .result-dot {
    display: none;
    position: absolute;
    top: 8px; left: 8px;
    width: 7px; height: 7px;
    border-radius: 50%;
    border: 1.5px solid var(--bg);
  }
  .result-dot.success { display: block; background: var(--success); }
  .result-dot.error   { display: block; background: var(--error); }

  /* ── panel ───────────────────────────────────────────────── */
  .panel {
    width: ${PANEL_W}px;
    flex-shrink: 0;
    padding: 12px 14px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-right: none;               /* right edge sits at screen boundary */
    border-radius: 12px 0 0 12px;
    box-shadow: var(--shadow);
    color: var(--text);
    box-sizing: border-box;
    pointer-events: auto;
  }

  /* ── panel header: label + shortcuts toggle ──────────────── */
  .panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .panel-label {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 500;
    flex: 1;
    letter-spacing: 0.01em;
  }
  .btn-help {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: transparent;
    font-size: 10px;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    pointer-events: auto;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .btn-help:hover { color: var(--accent); border-color: var(--accent); }
  .btn-help.active { color: var(--accent); border-color: var(--accent); background: var(--accent-bg); }

  /* ── count row: shown only when selection > 0 ────────────── */
  .count-row { margin-bottom: 8px; }
  .count-row.hidden { display: none; }
  .count-badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-bg);
    border-radius: 10px;
    padding: 2px 9px;
    transition: color 0.15s, background 0.15s;
  }
  .count-badge.warn {
    color: var(--warn);
    background: var(--warn-bg);
  }

  /* ── shortcuts grid: hidden by default ───────────────────── */
  .shortcuts {
    margin-bottom: 8px;
    padding: 7px 9px;
    background: var(--ghost-bg);
    border-radius: 8px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
  }
  .shortcuts.hidden { display: none; }
  .key {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 10px;
    color: var(--text-dim);
    text-align: right;
    white-space: nowrap;
  }
  .hint-label {
    font-size: 10.5px;
    color: var(--text-muted);
  }

  /* ── action bar: shown when selection > 0 ────────────────── */
  .action-bar {
    display: none;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--divider);
  }
  .action-bar.visible { display: flex; }

  /* ── exit bar ────────────────────────────────────────────── */
  .exit-bar {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--divider);
  }

  /* ── status message ──────────────────────────────────────── */
  .status {
    display: none;
    font-size: 11.5px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--divider);
    color: var(--text-muted);
    line-height: 1.4;
  }
  .status.visible { display: block; }
  .status.confirm { color: var(--warn); }
  .status.error   { color: var(--error); }
  .status.success { color: var(--success); }

  /* ── progress bar ────────────────────────────────────────── */
  .progress-bar {
    height: 2px;
    background: var(--divider);
    border-radius: 1px;
    margin-top: 6px;
    display: none;
    overflow: hidden;
  }
  .progress-bar.visible { display: block; }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 1px;
    transition: width 0.2s;
    width: 0%;
  }

  /* ── buttons ─────────────────────────────────────────────── */
  .btn {
    font-size: 11.5px;
    font-family: inherit;
    border: none;
    border-radius: 6px;
    padding: 5px 10px;
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.15s;
    white-space: nowrap;
    pointer-events: auto;
  }
  .btn:hover { opacity: 0.82; }
  .btn-delete { background: var(--danger); color: #fff; }
  .btn-clear  { background: var(--ghost-bg); color: var(--ghost-fg); border: 1px solid var(--border); }
  .btn-exit {
    width: 100%;
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--divider);
    transition: background 0.15s, color 0.15s;
  }
  .btn-exit:hover { background: var(--ghost-bg); color: var(--text-muted); opacity: 1; }
`;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let themeObserver: MutationObserver | null = null;

let cardEl:          HTMLElement | null        = null;
let tabEl:           HTMLElement | null        = null;
let resultDotEl:     HTMLElement | null        = null;
let countBadgeEl:    HTMLElement | null        = null;
let countRowEl:      HTMLElement | null        = null;
let shortcutsEl:     HTMLElement | null        = null;
let helpBtnEl:       HTMLButtonElement | null  = null;
let statusEl:        HTMLElement | null        = null;
let progressBarEl:   HTMLElement | null        = null;
let progressFillEl:  HTMLElement | null        = null;
let actionBarEl:     HTMLElement | null        = null;
let deleteBtnEl:     HTMLButtonElement | null  = null;
let clearBtnEl:      HTMLButtonElement | null  = null;
let exitBtnEl:       HTMLButtonElement | null  = null;
let resultDotTimer:  ReturnType<typeof setTimeout> | null = null;

let deleteHandler: (() => void) | null = null;
let clearHandler:  (() => void) | null = null;
let selectHandler: (() => void) | null = null;
let exitHandler:   (() => void) | null = null;

function openCard()  { cardEl?.classList.add('open'); }
function closeCard() { cardEl?.classList.remove('open'); }

let revealed = false;
let revealTimer: ReturnType<typeof setTimeout> | null = null;

// ── theme ─────────────────────────────────────────────────────────────────────
// ChatGPT toggles a `dark` class on <html> when the user picks a theme manually,
// independently of the OS. Track that class rather than relying only on
// prefers-color-scheme so the overlay matches the site's active theme.

function detectTheme(): 'dark' | 'light' {
  if (document.documentElement.classList.contains('dark')) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  host?.classList.toggle('light', theme === 'light');
  host?.classList.toggle('dark', theme === 'dark');
}

export function initOverlay() {
  if (host) return;

  const mac = isMac();
  const mod = mac ? '⌘' : 'Ctrl+';

  const hints: [string, string][] = [
    ['click',   t('key_chat')],
    [`${mod}A`, t('key_all')],
    [`${mod}D`, t('key_clear')],
    ['↩ × 2',  t('key_delete')],
    ['Esc',     t('key_exit')],
  ];

  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${SHADOW_CSS}</style>

    <div class="card">

      <!-- Tab pill: compact tongue visible at screen edge when closed -->
      <div class="tab" role="button" tabindex="0" aria-label="${t('btn_select')}">
        <span class="result-dot"></span>
        ${LOGO_ICON}
        ${ARROW_LEFT}
        ${ARROW_RIGHT}
      </div>

      <!-- Panel: slides in from the right -->
      <div class="panel" role="region" aria-label="${t('mode_title')}">

        <div class="panel-header">
          <span class="panel-label">${t('mode_title')}</span>
          <button class="btn-help" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">?</button>
        </div>

        <!-- Count badge row: hidden when 0 selected -->
        <div class="count-row hidden">
          <span class="count-badge"></span>
        </div>

        <!-- Shortcuts grid: hidden by default, toggled by ? button -->
        <div class="shortcuts hidden">
          ${hints.map(([k, l]) => `<span class="key">${k}</span><span class="hint-label">${l}</span>`).join('')}
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

    </div>
  `;

  cardEl        = shadow.querySelector('.card');
  tabEl         = shadow.querySelector('.tab');
  resultDotEl   = shadow.querySelector('.result-dot');
  countBadgeEl  = shadow.querySelector('.count-badge');
  countRowEl    = shadow.querySelector('.count-row');
  shortcutsEl   = shadow.querySelector('.shortcuts');
  helpBtnEl     = shadow.querySelector('.btn-help');
  statusEl      = shadow.querySelector('.status');
  progressBarEl = shadow.querySelector('.progress-bar');
  progressFillEl = shadow.querySelector('.progress-fill');
  actionBarEl   = shadow.querySelector('.action-bar');
  deleteBtnEl   = shadow.querySelector('.btn-delete');
  clearBtnEl    = shadow.querySelector('.btn-clear');
  exitBtnEl     = shadow.querySelector('.btn-exit');

  // Theme: apply once, then track ChatGPT's manual theme switches on <html>.
  applyTheme(detectTheme());
  themeObserver = new MutationObserver(() => applyTheme(detectTheme()));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Tab click: enter selection or exit depending on current mode
  tabEl?.addEventListener('click', () => {
    getMode() === 'idle' ? selectHandler?.() : exitHandler?.();
  });
  tabEl?.addEventListener('keydown', (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' || ke.key === ' ') {
      ke.preventDefault();
      getMode() === 'idle' ? selectHandler?.() : exitHandler?.();
    }
  });

  // Shortcuts toggle
  helpBtnEl?.addEventListener('click', () => {
    if (!shortcutsEl || !helpBtnEl) return;
    const isHidden = shortcutsEl.classList.toggle('hidden');
    helpBtnEl.classList.toggle('active', !isHidden);
  });

  deleteBtnEl?.addEventListener('click', () => deleteHandler?.());
  clearBtnEl?.addEventListener('click',  () => clearHandler?.());
  exitBtnEl?.addEventListener('click',   () => exitHandler?.());

  onModeChange((mode) => {
    const active = mode === 'active';
    tabEl?.classList.toggle('active', active);
    active ? openCard() : closeCard();
    if (!active) clearStatus();
  });

  onSelectionChange((ids) => {
    if (!countBadgeEl || !countRowEl) return;
    const n = ids.size;

    countBadgeEl.textContent =
      n === 1 ? t('sel1') :
                t('selN', [String(n)]);

    countBadgeEl.classList.remove('warn');
    countRowEl.classList.toggle('hidden', n === 0);
    actionBarEl?.classList.toggle('visible', n > 0);

    if (deleteBtnEl) {
      deleteBtnEl.textContent = n === 1 ? t('btn_del1') : t('btn_delN', [String(n)]);
    }
  });

  if (getMode() === 'active') {
    tabEl?.classList.add('active');
    openCard();
  }
}

// Only reveal the tab once there's a chat list to act on — no point showing
// a "select chats to delete" affordance with nothing to select.
export function revealTab() {
  if (revealed || revealTimer || !host) return;
  revealTimer = setTimeout(() => {
    revealTimer = null;
    if (!host) return; // destroyed before the delay elapsed
    revealed = true;
    document.body.appendChild(host);

    if (getMode() === 'active') return; // already shown via initOverlay's own check
    cardEl?.classList.add('card-enter');
    cardEl?.addEventListener('animationend', () => {
      cardEl?.classList.remove('card-enter');
    }, { once: true });
  }, REVEAL_DELAY_MS);
}

export function onSelectButtonClick(cb: () => void) { selectHandler = cb; }
export function onDeleteButtonClick(cb: () => void) { deleteHandler = cb; }
export function onClearButtonClick(cb: () => void)  { clearHandler  = cb; }
export function onExitButtonClick(cb: () => void)   { exitHandler   = cb; }

export function showConfirm(n: number) {
  setStatus(n === 1 ? t('conf1') : t('confN', [String(n)]), 'confirm');
  countBadgeEl?.classList.add('warn');
}

export function showProgress(done: number, total: number) {
  clearStatusText();
  if (!progressBarEl || !progressFillEl) return;
  progressBarEl.classList.add('visible');
  progressFillEl.style.width = `${Math.round((done / total) * 100)}%`;
}

export function showDeletedInStrip(succeeded: number, failed: number) {
  if (resultDotTimer) { clearTimeout(resultDotTimer); resultDotTimer = null; }
  if (!resultDotEl) return;
  resultDotEl.className = `result-dot ${failed === 0 ? 'success' : 'error'}`;
  resultDotTimer = setTimeout(() => {
    resultDotTimer = null;
    if (resultDotEl) resultDotEl.className = 'result-dot';
  }, 3000);
}

export function clearStatus() {
  clearStatusText();
  progressBarEl?.classList.remove('visible');
  countBadgeEl?.classList.remove('warn');
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
  if (resultDotTimer) { clearTimeout(resultDotTimer); resultDotTimer = null; }
  if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
  host?.remove();
  revealed = false;
  host = shadow = cardEl = tabEl = resultDotEl = countBadgeEl =
    countRowEl = shortcutsEl = helpBtnEl = statusEl = progressBarEl =
    progressFillEl = actionBarEl = deleteBtnEl = clearBtnEl = exitBtnEl = null;
  deleteHandler = clearHandler = selectHandler = exitHandler = null;
}
