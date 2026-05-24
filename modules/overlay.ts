import { onModeChange, onSelectionChange, getMode } from './selection';

const HOST_ID = 'cbd-overlay-host';

const HINTS = [
  ['J / K', 'navigate'],
  ['Space', 'select'],
  ['⇧J / ⇧K', 'range'],
  ['⌘A', 'all'],
  ['⌘D', 'clear'],
  ['↩ × 2', 'delete'],
  ['Esc', 'exit'],
];

const SHADOW_CSS = `
  :host {
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    pointer-events: none;
  }

  .panel {
    background: rgba(18, 18, 18, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 16px;
    color: #e5e5e5;
    min-width: 200px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    transform: translateY(0);
    opacity: 1;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .panel.hidden {
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10a37f;
    flex-shrink: 0;
  }

  .title {
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }

  .count {
    margin-left: auto;
    background: #10a37f;
    color: #fff;
    font-weight: 700;
    font-size: 11px;
    border-radius: 10px;
    padding: 1px 7px;
    min-width: 20px;
    text-align: center;
    transition: background 0.15s;
  }

  .count.zero {
    background: rgba(255,255,255,0.15);
  }

  .hints {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 10px;
    color: rgba(255,255,255,0.5);
  }

  .key {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.75);
    text-align: right;
    white-space: nowrap;
  }

  .label {
    font-size: 11px;
  }
`;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let countEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;

export function initOverlay() {
  if (document.getElementById(HOST_ID)) return;

  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>${SHADOW_CSS}</style>
    <div class="panel hidden">
      <div class="header">
        <span class="dot"></span>
        <span class="title">Selection mode</span>
        <span class="count zero">0</span>
      </div>
      <div class="hints">
        ${HINTS.map(([k, l]) => `<span class="key">${k}</span><span class="label">${l}</span>`).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(host);

  panelEl = shadow.querySelector('.panel');
  countEl = shadow.querySelector('.count');

  onModeChange((mode) => {
    panelEl?.classList.toggle('hidden', mode === 'idle');
  });

  onSelectionChange((ids) => {
    if (!countEl) return;
    const n = ids.size;
    countEl.textContent = String(n);
    countEl.classList.toggle('zero', n === 0);
  });

  // Reflect initial mode (e.g. if overlay mounted after enterMode)
  if (getMode() === 'active') panelEl?.classList.remove('hidden');
}

export function destroyOverlay() {
  host?.remove();
  host = null;
  shadow = null;
  countEl = null;
  panelEl = null;
}
