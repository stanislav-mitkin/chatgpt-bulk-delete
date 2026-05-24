# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome MV3 extension (WXT + TypeScript) that bulk-deletes ChatGPT conversations. No runtime dependencies — only browser APIs. Output: `.output/chrome-mv3/`.

## Commands

```bash
pnpm dev          # dev server with HMR (does not produce a loadable build)
pnpm build        # production build → .output/chrome-mv3/
pnpm zip          # packaged extension zip
pnpm test         # pnpm build && playwright test  (see Testing below)
playwright test --config playwright.auth.config.ts  # first-time session setup (pnpm auth in README)
```

After `pnpm build`, load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3/`.

## Testing

Tests run a real Chrome instance with the extension loaded against **live chatgpt.com** and a local Python mock server on port 3333 (auto-started by Playwright). **Run sparingly** — frequent requests may trigger bot detection. Before the first run, save a session with the auth command above (`test-profile/` is gitignored).

To run a single test: `playwright test -g "test name"`

Tests must have a built extension in `.output/chrome-mv3/` — always run `pnpm build` first (or use `pnpm test` which does both).

## Architecture

- `entrypoints/content.ts` — content script entry; waits for `<nav>`/`<aside>` before activating
- `modules/overlay.ts` — Shadow DOM overlay (idle card + select-mode panel + bottom strip)
- `modules/keybindings.ts` — keyboard + mouse event delegation
- `modules/selection.ts` — selection state machine (`idle` / `active`)
- `modules/chat-list.ts` — sidebar chat link detection via MutationObserver
- `modules/platform.ts` — cached `isMac` boolean (use this, not `navigator.platform`)
- `modules/deleter.ts` — `PATCH /backend-api/conversation/{id}` with `{is_visible: false}`
- `modules/i18n.ts` — thin wrapper around `browser.i18n`; access deferred to runtime (not module load)

If ChatGPT changes its DOM, update `buildChatList()` in `modules/chat-list.ts`.

## Style

- Conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
- No linter or formatter — rely on TypeScript strict mode
- CSS lives in `modules/overlay.ts` as a template literal (Shadow DOM); use existing CSS custom properties (`--bg`, `--text`, etc.) for new UI
- All extension CSS classes are prefixed `cbd-` to avoid collisions with ChatGPT's styles

## Dev config

`wxt.config.dev.ts` adds `http://localhost:3333/*` to `host_permissions` for local test fixtures. Production build uses `wxt.config.ts` only.
