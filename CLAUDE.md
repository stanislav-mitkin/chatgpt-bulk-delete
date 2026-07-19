# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chrome MV3 extension (WXT + TypeScript) that bulk-deletes ChatGPT conversations. No runtime dependencies — only browser APIs. Output: `.output/chrome-mv3/`.

## Commands

```bash
pnpm dev          # dev server with HMR (does not produce a loadable build)
pnpm build        # production build → .output/chrome-mv3/
pnpm zip          # packaged extension zip
```

After `pnpm build`, load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3/`.

## Architecture

The code is split into a site-agnostic `core/` engine and a ChatGPT-specific `adapter/`. The overlay UI, selection state machine, and keybindings are shared (mirrored from a sibling Gemini extension); only the delete API, chat-list DOM detection, and branding/colors are ChatGPT-specific.

- `entrypoints/content.ts` — content script entry; wires the adapter into the core engine
- `core/overlay.ts` — Shadow DOM overlay (slide-out tab + panel + result dot); keeps manual ChatGPT theme tracking (MutationObserver on `<html>` `class` for `dark`) on top of `prefers-color-scheme`
- `core/keybindings.ts` — keyboard + mouse event delegation (`Ctrl/⌘+Shift+X` activation, shift-brush selection, confirm-then-delete)
- `core/selection.ts` — selection state machine (`idle` / `active`), DI'd with the adapter's chat-list source
- `core/style-injector.ts` — generic `<style>` lifecycle (`cbd-styles` id)
- `core/platform.ts` — cached `isMac` boolean (use this, not `navigator.platform`)
- `core/i18n.ts` — thin wrapper around `browser.i18n`; access deferred to runtime (not module load)
- `core/types.ts` — `ChatAdapter` / `ChatListSource` / `Deleter` contracts
- `adapter/chatgpt/chat-list.ts` — sidebar chat link detection via MutationObserver
- `adapter/chatgpt/deleter.ts` — `PATCH /backend-api/conversation/{id}` with `{is_visible: false}`
- `adapter/chatgpt/styles.ts` — highlight CSS for `cbd-hover` / `cbd-selected` / `cbd-sidebar-active`
- `adapter/chatgpt/index.ts` — assembles `chatgptAdapter: ChatAdapter`

If ChatGPT changes its DOM, update `buildChatList()` in `adapter/chatgpt/chat-list.ts`.

## Style

- Conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
- No linter or formatter — rely on TypeScript strict mode
- Overlay CSS lives in `core/overlay.ts` as a template literal (Shadow DOM); use existing CSS custom properties (`--bg`, `--text`, etc.) for new UI
- All extension CSS classes are prefixed `cbd-` to avoid collisions with ChatGPT's styles
