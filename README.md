# ChatGPT Chat Cleaner

Minimal Chrome extension for bulk-deleting ChatGPT conversations. A small tab on the right edge of the screen — or a keyboard shortcut — puts the sidebar into selection mode.

## Hotkeys

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Shift + X` | Enter / exit selection mode |
| Click | Toggle selection on a chat |
| `Shift + hover` | Brush-select multiple chats at once |
| `Cmd/Ctrl + A` | Select all visible chats |
| `Cmd/Ctrl + D` | Clear selection |
| `Enter` × 2 | Delete selected (press once → confirm, press again within 2s → delete) |
| `Esc` | Exit selection mode |

## Install (development)

```bash
pnpm install
pnpm build          # builds to .output/chrome-mv3/
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select `.output/chrome-mv3/`.

## How it works

- Detects chat links inside `#history` (the chat list in the sidebar) via MutationObserver
- Deletion: `PATCH /backend-api/conversation/{id}` with `{is_visible: false}` — same as the official UI
- Token fetched from `/api/auth/session` (uses existing session cookies, no extra login)
- Optimistic UI: rows disappear immediately, restored on API failure
- Selection mode highlights only `#history` (the chat list), not the whole sidebar
- All styles isolated via Shadow DOM (overlay) and unique CSS class prefix `cbd-`

## Architecture

The code is split into a site-agnostic `core/` engine (overlay, selection state machine, keybindings — shared in spirit with a sibling Gemini extension) and a ChatGPT-specific `adapter/chatgpt/` (delete API, chat-list DOM detection, colors). See [`CLAUDE.md`](CLAUDE.md) for the full breakdown.

## Selector maintenance

If ChatGPT changes its DOM structure, update `buildChatList()` in [`adapter/chatgpt/chat-list.ts`](adapter/chatgpt/chat-list.ts).
